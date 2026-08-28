from __future__ import annotations

import argparse
import ast
import asyncio
import inspect
import json
import os
import random
import re
import sys
import tempfile
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

ENGINE_LOCK = "paddle-det+vietocr-rec:vgg_seq2seq"
TOKEN_ENV = "OCR_WORKER_TOKEN"
FRONTEND_PATHS = ["/api/ocr-worker"]
BACKEND_TOKEN_HEADERS = ["X-QLKLT-Worker-Token"]
BACKEND_ID_HEADERS = ["X-QLKLT-Worker-Id"]
POLL_SECONDS = 3.0
HEARTBEAT_SECONDS = 45.0
HTTP_TIMEOUT = 45


def _log(message: str) -> None:
    safe = str(message).replace("\r", " ").replace("\n", " ")
    print(time.strftime("%Y-%m-%d %H:%M:%S") + " " + safe, flush=True)


def _api_root_from_script() -> Path:
    return Path(__file__).resolve().parent.parent


def _contract_root() -> Path:
    value = os.environ.get("OCR_CONTRACT_ROOT", "").strip()
    return Path(value).resolve() if value else _api_root_from_script()


def _local_api_root() -> Path:
    value = os.environ.get("OCR_LOCAL_API_ROOT", "").strip()
    return Path(value).resolve() if value else _api_root_from_script()


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def _unwrap_json(value: Any) -> Any:
    current = value
    for _ in range(4):
        if not isinstance(current, dict):
            break
        if "data" in current and isinstance(current.get("data"), (dict, list)):
            current = current["data"]
            continue
        if "job" in current and isinstance(current.get("job"), dict):
            current = current["job"]
            continue
        break
    return current


def _find_key(value: Any, names: Iterable[str]) -> Any:
    wanted = {str(x).lower() for x in names}
    queue: List[Any] = [value]
    seen = set()
    while queue:
        item = queue.pop(0)
        marker = id(item)
        if marker in seen:
            continue
        seen.add(marker)
        if isinstance(item, dict):
            for key, child in item.items():
                if str(key).lower() in wanted and child not in (None, ""):
                    return child
            queue.extend(item.values())
        elif isinstance(item, (list, tuple)):
            queue.extend(item)
    return None


def _json_bytes(value: Dict[str, Any]) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _headers(worker_id: str, credential: str, json_body: bool = True, include_worker_auth: bool = True) -> Dict[str, str]:
    result = {
        "Accept": "application/json, application/pdf, application/octet-stream;q=0.9, */*;q=0.1",
        "User-Agent": "QuanLyKhoLuuTru-OCR-Worker/4.14.05D",
    }
    if include_worker_auth:
        for name in BACKEND_ID_HEADERS:
            result[name] = worker_id
        for name in BACKEND_TOKEN_HEADERS:
            result[name] = credential
    if json_body:
        result["Content-Type"] = "application/json; charset=utf-8"
    return result


def _request(method: str, url: str, worker_id: str, credential: str,
             body: Optional[Dict[str, Any]] = None, timeout: int = HTTP_TIMEOUT,
             send_worker_auth: bool = True) -> Tuple[int, str, bytes, str]:
    data = _json_bytes(body) if body is not None else None
    req = urllib.request.Request(url, data=data, method=method.upper(), headers=_headers(worker_id, credential, body is not None, send_worker_auth))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return int(resp.status), str(resp.headers.get("Content-Type", "")), raw, str(resp.geturl())
    except urllib.error.HTTPError as exc:
        try:
            raw = exc.read()
        except Exception:
            raw = b""
        return int(exc.code), str(exc.headers.get("Content-Type", "") if exc.headers else ""), raw, url


def _request_json(method: str, url: str, worker_id: str, credential: str,
                  body: Optional[Dict[str, Any]] = None, timeout: int = HTTP_TIMEOUT) -> Tuple[int, Any]:
    status, ctype, raw, _ = _request(method, url, worker_id, credential, body, timeout)
    if not raw:
        return status, None
    try:
        return status, json.loads(raw.decode("utf-8-sig"))
    except Exception:
        preview = raw[:160].decode("utf-8", errors="replace")
        raise RuntimeError("HTTP %s returned non-JSON response prefix=%r" % (status, preview))


def _parse_route_entries(contract_root: Path) -> List[Tuple[str, str]]:
    text = _read(contract_root / "apps" / "ocr" / "urls.py")
    pattern = re.compile(
        r"(?:path|re_path)\(\s*[rubfRUBF]*[\"'](?P<route>[^\"']+)[\"']\s*,\s*(?P<view>[A-Za-z_][A-Za-z0-9_]*)\.as_view\s*\(",
        re.MULTILINE,
    )
    return [(m.group("route"), m.group("view")) for m in pattern.finditer(text)]


def _discover_routes(contract_root: Path) -> Dict[str, Dict[str, str]]:
    entries = _parse_route_entries(contract_root)
    if not entries:
        raise RuntimeError("No DRF path(...View.as_view()) entries found in apps/ocr/urls.py")
    found: Dict[str, Dict[str, str]] = {}
    synonyms = {
        "health": ("health",),
        "claim": ("claim", "acquire", "lease"),
        "heartbeat": ("heartbeat", "heart-beat", "renew"),
        "complete": ("complete", "result", "finish", "success"),
        "fail": ("fail", "failure", "error", "retry"),
    }
    for route, view in entries:
        probe = (route + " " + view).lower()
        for kind, words in synonyms.items():
            if kind in found:
                continue
            if any(word in probe for word in words):
                found[kind] = {"route": route, "view": view}
    # V74 exact WorkerCompleteView override.
    _v74_complete_entries = [(route, view) for route, view in entries if view == "WorkerCompleteView"]
    if len(_v74_complete_entries) != 1:
        raise RuntimeError("WorkerCompleteView route contract is not unique")
    _v74_complete_route, _v74_complete_view = _v74_complete_entries[0]
    found["complete"] = {"route": _v74_complete_route, "view": _v74_complete_view}
    missing = [name for name in ("health", "claim", "heartbeat", "complete", "fail") if name not in found]
    if missing:
        raise RuntimeError("Worker URL contract missing route kinds: " + ",".join(missing))
    return found


def _route_url(base: str, route: str) -> str:
    base = base.rstrip("/")
    clean = route.lstrip("/")
    if clean.startswith("api/"):
        return base + "/" + clean
    return base + "/api/ocr/" + clean


def _class_request_keys(contract_root: Path, class_name: str) -> List[str]:
    source = _read(contract_root / "apps" / "ocr" / "worker_views.py")
    tree = ast.parse(source)
    node = next((x for x in tree.body if isinstance(x, ast.ClassDef) and x.name == class_name), None)
    if node is None:
        return []
    keys = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute) and child.func.attr == "get" and child.args:
            arg = child.args[0]
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                keys.add(arg.value)
        if isinstance(child, ast.Subscript):
            sl = child.slice
            value = None
            if isinstance(sl, ast.Constant) and isinstance(sl.value, str):
                value = sl.value
            elif hasattr(ast, "Index") and isinstance(sl, ast.Index) and isinstance(getattr(sl, "value", None), ast.Constant):
                value = sl.value.value
            if isinstance(value, str):
                keys.add(value)
    return sorted(keys)


def _semantic_payload(keys: List[str], context: Dict[str, Any], phase: str) -> Dict[str, Any]:
    supported = {
        "worker_id": context.get("worker_id"),
        "job_id": context.get("job_id"),
        "id": context.get("job_id"),
        "ocr_job_id": context.get("job_id"),
        "lease_token": context.get("lease_token"),
        "mode": context.get("mode"),
        "pipeline_id": context.get("pipeline_id"),
        "digital_file_id": context.get("digital_file_id"),
        "file_id": context.get("digital_file_id"),
        "text": context.get("text"),
        "result_text": context.get("text"),
        "ocr_text": context.get("text"),
        "content": context.get("text"),
        "engine": context.get("engine"),
        "error": context.get("error"),
        "error_message": context.get("error"),
        "message": context.get("error"),
        "retryable": context.get("retryable", True),
        "processing_ms": context.get("processing_ms"),
        "duration_ms": context.get("processing_ms"),
        "metadata": context.get("metadata"),
        "meta": context.get("metadata"),
        "result": {"text": context.get("text"), "engine": context.get("engine"), "metadata": context.get("metadata")},
        "recognized_text": context.get("text"),
        "raw_text": context.get("text"),
        "error_code": "worker_error" if context.get("error") else None,
    }
    relevant = [k for k in keys if k in supported]
    if not relevant:
        fallback = {
            "claim": ["worker_id"],
            "health": ["worker_id"],
            "heartbeat": ["worker_id", "job_id", "lease_token"],
            "complete": ["worker_id", "job_id", "lease_token", "text", "engine"],
            "fail": ["worker_id", "job_id", "lease_token", "error", "retryable"],
        }[phase]
        relevant = fallback
    payload = {}
    for key in relevant:
        value = supported.get(key)
        if value is not None:
            payload[key] = value
    if "worker_id" not in payload and context.get("worker_id"):
        payload["worker_id"] = context["worker_id"]
    # V74 complete lease token is a helper-level control field invisible to direct request.data AST introspection.
    _v74_complete_lease_token = context.get("lease_token") if phase == "complete" else None
    if _v74_complete_lease_token not in (None, ""):
        payload["lease_token"] = _v74_complete_lease_token
    # V75: WorkerFailView obtains lease_token through _lease_token(request),
    # which direct request.data AST introspection cannot see. Preserve only this control field.
    _v75_fail_lease_token = context.get("lease_token") if phase == "fail" else None
    if _v75_fail_lease_token not in (None, ""):
        payload["lease_token"] = _v75_fail_lease_token
    return payload


def _discover_runner(local_api_root: Path) -> Dict[str, Any]:
    path = local_api_root / "apps" / "ocr" / "runner.py"
    source = _read(path)
    tree = ast.parse(source)
    candidates: List[Dict[str, Any]] = []
    path_words = ("path", "file", "pdf", "image", "input", "source")
    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if node.name.startswith("_") or node.name.lower() in {"main", "cli"}:
            continue
        args = [x.arg for x in node.args.args]
        lower_args = [x.lower() for x in args]
        if not any(any(word in arg for word in path_words) for arg in lower_args):
            continue
        segment = ast.get_source_segment(source, node) or ""
        probe = (node.name + " " + segment).lower()
        score = 0
        if "ocr" in node.name.lower():
            score += 10
        if any(x in node.name.lower() for x in ("run", "process", "extract")):
            score += 5
        if "vgg_seq2seq" in probe:
            score += 12
        if "vietocr" in probe:
            score += 8
        if "paddle" in probe:
            score += 5
        if any("mode" in x or "quality" in x for x in lower_args):
            score += 3
        required = []
        defaults_start = len(args) - len(node.args.defaults)
        for index, name in enumerate(args):
            if index < defaults_start:
                required.append(name)
        candidates.append({
            "name": node.name,
            "async": isinstance(node, ast.AsyncFunctionDef),
            "args": args,
            "required": required,
            "score": score,
        })
    if not candidates:
        raise RuntimeError("No path-oriented callable found in apps/ocr/runner.py")
    candidates.sort(key=lambda x: (x["score"], x["name"]), reverse=True)
    selected = candidates[0]
    allowed_required = {
        "path", "file", "file_path", "pdf", "pdf_path", "image", "image_path", "input", "input_path",
        "source", "source_path", "mode", "ocr_mode", "quality", "engine", "pipeline", "pipeline_id",
        "job_id", "digital_file_id", "file_id", "lang", "language",
    }
    unknown = []
    for name in selected["required"]:
        low = name.lower()
        if low in allowed_required:
            continue
        if any(word in low for word in path_words):
            continue
        unknown.append(name)
    if unknown:
        raise RuntimeError("Selected runner callable has unsupported required parameters: " + ",".join(unknown))
    return selected


def _runner_kwargs(signature: inspect.Signature, file_path: str, mode: str, job: Dict[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    job_id = _find_key(job, ("id", "job_id", "ocr_job_id"))
    file_id = _find_key(job, ("digital_file_id", "file_id"))
    pipeline_id = _find_key(job, ("pipeline_id",))
    for name, param in signature.parameters.items():
        low = name.lower()
        value: Any = None
        has_value = True
        if low in {"path", "file", "file_path", "pdf", "pdf_path", "image", "image_path", "input", "input_path", "source", "source_path"} or any(
            word in low for word in ("file_path", "pdf_path", "image_path", "source_path", "input_path")
        ):
            value = file_path
        elif low in {"mode", "ocr_mode", "quality"}:
            value = mode
        elif low == "engine":
            value = ENGINE_LOCK
        elif low in {"pipeline", "pipeline_id"}:
            value = pipeline_id or mode
        elif low in {"job_id", "ocr_job_id"}:
            value = job_id
        elif low in {"digital_file_id", "file_id"}:
            value = file_id
        elif low in {"lang", "language"}:
            value = "vi"
        else:
            has_value = False
        if has_value and value is not None:
            result[name] = value
        elif param.default is inspect._empty and param.kind not in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
            raise RuntimeError("Runner parameter cannot be supplied safely: " + name)
    return result


def _normalize_ocr_result(result: Any, mode: str) -> Tuple[str, str, Dict[str, Any]]:
    text: Optional[str] = None
    engine: Optional[str] = None
    metadata: Dict[str, Any] = {}
    if isinstance(result, str):
        text = result
    elif isinstance(result, dict):
        metadata = dict(result)
        for key in ("text", "ocr_text", "result_text", "content"):
            value = result.get(key)
            if isinstance(value, str) and value.strip():
                text = value
                break
        value = result.get("engine")
        if isinstance(value, str) and value.strip():
            engine = value
    elif isinstance(result, (list, tuple)):
        for value in result:
            if text is None and isinstance(value, str) and value.strip():
                text = value
            if isinstance(value, dict):
                metadata.update(value)
                if text is None:
                    for key in ("text", "ocr_text", "result_text", "content"):
                        candidate = value.get(key)
                        if isinstance(candidate, str) and candidate.strip():
                            text = candidate
                            break
                if engine is None and isinstance(value.get("engine"), str):
                    engine = value.get("engine")
    else:
        for key in ("text", "ocr_text", "result_text", "content"):
            value = getattr(result, key, None)
            if isinstance(value, str) and value.strip():
                text = value
                break
        value = getattr(result, "engine", None)
        if isinstance(value, str) and value.strip():
            engine = value
    if not text:
        raise RuntimeError("OCR runner returned no textual result")
    if not engine:
        engine = ENGINE_LOCK if mode.lower() == "quality" else ENGINE_LOCK
    metadata = {k: v for k, v in metadata.items() if k not in {"token", "authorization", "signed_url", "presigned_url"}}
    def json_safe(value: Any, depth: int = 0) -> Any:
        if depth > 5:
            return str(value)[:500]
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, dict):
            return {str(k): json_safe(v, depth + 1) for k, v in value.items() if str(k).lower() not in {"token", "authorization", "signed_url", "presigned_url"}}
        if isinstance(value, (list, tuple)):
            return [json_safe(v, depth + 1) for v in value[:100]]
        return str(value)[:2000]
    metadata = json_safe(metadata)
    metadata.setdefault("mode", mode)
    metadata.setdefault("engine", engine)
    return text, engine, metadata


def _invoke_runner_adapter(local_api_root, module, func, kwargs, runner_name):
    runner_path = local_api_root / "apps" / "ocr" / "runner.py"
    source = _read(runner_path)
    tree = ast.parse(source)
    nodes = [
        node for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == runner_name
    ]
    if len(nodes) != 1:
        raise RuntimeError("Selected OCR runner source contract is ambiguous: " + runner_name)
    node = nodes[0]

    def root_name(expr):
        current = expr
        while isinstance(current, ast.Attribute):
            current = current.value
        return current.id if isinstance(current, ast.Name) else None

    parents = {}
    for parent in ast.walk(node):
        for child in ast.iter_child_nodes(parent):
            parents[child] = parent

    update_calls = []
    for item in ast.walk(node):
        if isinstance(item, ast.Attribute) and item.attr == "objects":
            if root_name(item.value) != "OcrJob":
                raise RuntimeError("Selected OCR runner has non-OcrJob ORM access")
            p1 = parents.get(item)
            p2 = parents.get(p1)
            p3 = parents.get(p2)
            p4 = parents.get(p3)
            if not (
                isinstance(p1, ast.Attribute) and p1.attr == "filter"
                and isinstance(p2, ast.Call)
                and isinstance(p3, ast.Attribute) and p3.attr == "update"
                and isinstance(p4, ast.Call)
            ):
                raise RuntimeError("Selected OCR side-effect runner has unsupported ORM access")
            update_calls.append(p4)

    non_none_returns = []
    for item in ast.walk(node):
        if isinstance(item, ast.Return) and item.value is not None:
            if not (isinstance(item.value, ast.Constant) and item.value.value is None):
                non_none_returns.append(item)

    if not update_calls or non_none_returns:
        result = func(**kwargs)
        if inspect.isawaitable(result):
            result = asyncio.run(result)
        return result

    if runner_name != "run_worker_and_update_job" or len(update_calls) != 4:
        raise RuntimeError("Selected OCR side-effect runner contract is not the locked four-update adapter")

    completed_calls = []
    for call in update_calls:
        kw = {item.arg: item.value for item in call.keywords if item.arg}
        status_node = kw.get("status")
        if (
            isinstance(status_node, ast.Attribute) and status_node.attr == "COMPLETED"
            and isinstance(status_node.value, ast.Attribute) and status_node.value.attr == "Status"
            and isinstance(status_node.value.value, ast.Name) and status_node.value.value.id == "OcrJob"
        ):
            completed_calls.append(call)
    if len(completed_calls) != 1:
        raise RuntimeError("Selected OCR side-effect runner must have exactly one COMPLETED update")
    completed_keys = {item.arg for item in completed_calls[0].keywords if item.arg}
    if "extracted_text" not in completed_keys or "engine" not in completed_keys:
        raise RuntimeError("Selected OCR COMPLETED update lacks extracted_text/engine contract")

    real_ocr_job = getattr(module, "OcrJob", None)
    if real_ocr_job is None or not hasattr(real_ocr_job, "Status"):
        raise RuntimeError("Selected OCR runner module does not expose OcrJob.Status")
    captured = []

    class CapturedQuery:
        def update(self, **values):
            captured.append(dict(values))
            return 1

    class CapturedManager:
        def filter(self, *args, **values):
            return CapturedQuery()

    class ProxyMeta(type):
        def __getattr__(cls, name):
            return getattr(real_ocr_job, name)

    class OcrJobProxy(metaclass=ProxyMeta):
        objects = CapturedManager()

    module.OcrJob = OcrJobProxy
    try:
        result = func(**kwargs)
        if inspect.isawaitable(result):
            result = asyncio.run(result)
    finally:
        module.OcrJob = real_ocr_job

    if result is not None:
        return result

    completed_value = getattr(real_ocr_job.Status, "COMPLETED")
    completed = [
        values for values in captured
        if values.get("status") == completed_value or str(values.get("status")) == str(completed_value)
    ]
    if len(completed) != 1:
        raise RuntimeError("OCR side-effect runner did not emit exactly one COMPLETED update")
    payload = dict(completed[0])
    text = payload.get("extracted_text")
    engine = payload.get("engine")
    if not isinstance(text, str) or not text.strip():
        raise RuntimeError("OCR side-effect runner COMPLETED update has empty extracted_text")
    if not isinstance(engine, str) or not engine.strip():
        raise RuntimeError("OCR side-effect runner COMPLETED update has empty engine")
    payload["text"] = text
    payload["ocr_text"] = text
    payload["runner_adapter"] = "captured-completed-update"
    return payload


def _run_local_ocr(local_api_root: Path, file_path: str, mode: str, job: Dict[str, Any]) -> Tuple[str, str, Dict[str, Any]]:
    selected = _discover_runner(local_api_root)
    root_text = str(local_api_root)
    if root_text not in sys.path:
        sys.path.insert(0, root_text)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        import django  # type: ignore
        django.setup()
    except Exception:
        pass
    module = __import__("apps.ocr.runner", fromlist=[selected["name"]])
    func = getattr(module, selected["name"])
    signature = inspect.signature(func)
    kwargs = _runner_kwargs(signature, file_path, mode, job)
    result = _invoke_runner_adapter(local_api_root, module, func, kwargs, selected["name"])
    return _normalize_ocr_result(result, mode)


def _extract_source_hint(job: Any) -> Optional[str]:
    value = _find_key(job, ("source_url", "download_url", "signed_url", "presigned_url", "url"))
    if isinstance(value, str) and value.startswith(("https://", "http://")):
        return value
    return None


def _candidate_frontend_payload(context: Dict[str, Any]) -> Dict[str, Any]:
    keys = ("worker_id", "job_id", "lease_token", "digital_file_id", "file_id", "pipeline_id", "mode", "pathname")
    payload = {key: context.get(key) for key in keys if context.get(key) is not None}
    if context.get("digital_file_id") is not None:
        payload.setdefault("file_id", context["digital_file_id"])
        payload.setdefault("digitalFileId", context["digital_file_id"])
        payload.setdefault("fileId", context["digital_file_id"])
    if context.get("job_id") is not None:
        payload.setdefault("jobId", context["job_id"])
    if context.get("lease_token") is not None:
        payload.setdefault("leaseToken", context["lease_token"])
    return payload


def _download_direct(url: str, worker_id: str, credential: str) -> bytes:
    status, ctype, raw, _ = _request("GET", url, worker_id, credential, None, timeout=120, send_worker_auth=False)
    if status != 200:
        raise RuntimeError("Source download HTTP status=" + str(status))
    if not raw:
        raise RuntimeError("Source download returned empty body")
    return raw


def _obtain_source(frontend_base: str, worker_id: str, credential: str, context: Dict[str, Any], job: Any) -> bytes:
    direct = _extract_source_hint(job)
    if direct:
        return _download_direct(direct, worker_id, credential)
    payload = _candidate_frontend_payload(context)
    download_ticket = _find_key(job, ("download_ticket",))
    if not isinstance(download_ticket, str) or not download_ticket.strip():
        raise RuntimeError("Claim response missing download_ticket")
    payload["download_ticket"] = download_ticket.strip()
    errors: List[str] = []
    for suffix in FRONTEND_PATHS:
        endpoint = frontend_base.rstrip("/") + suffix
        attempts: List[Tuple[str, str, Optional[Dict[str, Any]]]] = [("POST", endpoint, payload)]
        # Lease-bound download tickets are secrets and must never enter a URL.
        if "download_ticket" not in payload:
            query = urllib.parse.urlencode({k: str(v) for k, v in payload.items() if v is not None})
            attempts.append(("GET", endpoint + (("?" + query) if query else ""), None))
        for method, url, body in attempts:
            try:
                status, ctype, raw, _ = _request(method, url, worker_id, credential, body, timeout=60)
                if status != 200:
                    errors.append(method + " " + suffix + "=" + str(status))
                    continue
                if raw.startswith(b"%PDF") or "application/pdf" in ctype.lower() or "application/octet-stream" in ctype.lower():
                    return raw
                try:
                    obj = json.loads(raw.decode("utf-8-sig"))
                except Exception:
                    errors.append(method + " " + suffix + "=non-json")
                    continue
                link = _find_key(obj, ("url", "source_url", "download_url", "signed_url", "presigned_url"))
                if isinstance(link, str) and link.startswith(("https://", "http://")):
                    return _download_direct(link, worker_id, credential)
            except Exception as exc:
                errors.append(method + " " + suffix + "=" + exc.__class__.__name__)
    raise RuntimeError("Frontend source route did not yield file; attempts=" + ",".join(errors[:12]))


def _materialize_job_endpoint(template: str, job_id: Any) -> str:
    marker = "<int:job_id>"
    value = str(template)
    if marker not in value:
        raise RuntimeError("Worker job endpoint template missing <int:job_id>")
    try:
        job_text = str(int(job_id))
    except Exception as exc:
        raise RuntimeError("Worker job endpoint has invalid job_id") from exc
    value = value.replace(marker, job_text)
    if "<" in value or ">" in value:
        raise RuntimeError("Worker job endpoint remains unmaterialized")
    return value


class _Heartbeat:
    def __init__(self, endpoint: str, worker_id: str, credential: str, payload: Dict[str, Any]):
        self.endpoint = endpoint
        self.worker_id = worker_id
        self.credential = credential
        self.payload = payload
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run, name="ocr-heartbeat", daemon=True)

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        self.thread.join(timeout=5)

    def _run(self) -> None:
        while not self.stop_event.wait(HEARTBEAT_SECONDS):
            try:
                status, _ = _request_json("POST", self.endpoint, self.worker_id, self.credential, self.payload)
                if status not in (200, 201, 204):
                    _log("heartbeat rejected status=" + str(status))
            except Exception as exc:
                _log("heartbeat transport error=" + exc.__class__.__name__)


def _self_test(contract_root: Path, local_api_root: Path) -> int:
    routes = _discover_routes(contract_root)
    selected = _discover_runner(local_api_root)
    worker_source = _read(contract_root / "apps" / "ocr" / "worker_views.py")
    if "lease_token" not in worker_source or "heartbeat" not in worker_source.lower() or "claim" not in worker_source.lower():
        raise RuntimeError("Recovered worker_views.py lacks durable lease markers")
    runner_source = _read(local_api_root / "apps" / "ocr" / "runner.py")
    paddle_source = _read(local_api_root / "scripts" / "paddle_ocr_worker.py")
    if "vgg_seq2seq" not in (runner_source + "\n" + paddle_source):
        raise RuntimeError("Locked vgg_seq2seq marker absent in local OCR source")
    print("SELF_TEST=PASS")
    print("ROUTES=" + ",".join(sorted(routes.keys())))
    print("RUNNER_ADAPTER=" + selected["name"])
    print("ENGINE=" + ENGINE_LOCK)
    return 0


def _run_forever(contract_root: Path, local_api_root: Path) -> int:
    backend = os.environ.get("OCR_BACKEND_URL") or os.environ.get("BACKEND_URL") or ""
    frontend = os.environ.get("OCR_FRONTEND_URL") or os.environ.get("FRONTEND_URL") or ""
    worker_id = os.environ.get("OCR_WORKER_ID") or os.environ.get("WORKER_ID") or ""
    credential = os.environ.get(TOKEN_ENV, "")
    if not backend or not frontend or not worker_id or not credential:
        raise RuntimeError("Required worker environment is incomplete")
    routes = _discover_routes(contract_root)
    endpoint = {name: _route_url(backend, item["route"]) for name, item in routes.items()}
    request_keys = {name: _class_request_keys(contract_root, item["view"]) for name, item in routes.items()}
    _discover_runner(local_api_root)
    health_context = {"worker_id": worker_id}
    health_payload = _semantic_payload(request_keys["health"], health_context, "health")
    health_status, _ = _request_json("POST", endpoint["health"], worker_id, credential, health_payload)
    if health_status != 200:
        raise RuntimeError("Worker health rejected status=" + str(health_status))
    _log("worker ready id=" + worker_id + " engine=" + ENGINE_LOCK)
    while True:
        context: Dict[str, Any] = {"worker_id": worker_id}
        try:
            claim_payload = _semantic_payload(request_keys["claim"], context, "claim")
            status, response = _request_json("POST", endpoint["claim"], worker_id, credential, claim_payload)
            _v82r12_claim_raw = response
            if status in (204, 404):
                time.sleep(POLL_SECONDS + random.random())
                continue
            if status != 200:
                _log("claim status=" + str(status))
                time.sleep(POLL_SECONDS + random.random())
                continue
            job = _unwrap_json(response)
            _v82r13_claim_data = None
            if isinstance(_v82r12_claim_raw, dict) and _v82r12_claim_raw.get("success") is True:
                _v82r13_claim_data = _v82r12_claim_raw.get("data")
            if (
                isinstance(_v82r13_claim_data, dict)
                and isinstance(_v82r13_claim_data.get("job"), dict)
            ):
                _v82r13_transport = {
                    key: value
                    for key, value in _v82r13_claim_data.items()
                    if key != "job"
                }
                job = dict(_v82r13_claim_data["job"])
                job.update(_v82r13_transport)
                if job.get("digital_file_id") is None and job.get("digital_file") is not None:
                    job["digital_file_id"] = job.get("digital_file")
            if not isinstance(job, dict) or not job:
                time.sleep(POLL_SECONDS + random.random())
                continue
            success = _find_key(response, ("success",))
            if success is False:
                time.sleep(POLL_SECONDS + random.random())
                continue
            job_id = _find_key(job, ("id", "job_id", "ocr_job_id"))
            lease_token = _find_key(job, ("lease_token",))
            pipeline_id = _find_key(job, ("pipeline_id",))
            mode_value = _find_key(job, ("mode", "ocr_mode", "pipeline_mode"))
            if mode_value is None and isinstance(pipeline_id, str) and pipeline_id.lower() in {"fast", "quality"}:
                mode_value = pipeline_id
            mode = str(mode_value or "quality").lower()
            digital_file_id = _find_key(job, ("digital_file_id", "file_id"))
            if digital_file_id is None and isinstance(job.get("digital_file"), dict):
                digital_file_id = job["digital_file"].get("id")
            pathname = _find_key(job, ("pathname", "blob_pathname", "blob_path", "storage_path"))
            _v82r12_raw = _v82r12_claim_raw
            _v82r12_state = "malformed"
            _v82r12_authoritative_job_id = None
            _v82r12_authoritative_lease_token = None
            _v82r12_poll_after = 5.0
            if isinstance(_v82r12_raw, dict):
                try:
                    _v82r12_poll_after = float(_v82r12_raw.get("poll_after_seconds") or 5)
                except (TypeError, ValueError):
                    _v82r12_poll_after = 5.0
                if _v82r12_raw.get("success") is True and "data" in _v82r12_raw:
                    _v82r12_data = _v82r12_raw.get("data")
                else:
                    _v82r12_data = _v82r12_raw
                if _v82r12_data is None:
                    _v82r12_state = "idle"
                elif isinstance(_v82r12_data, dict):
                    _v82r12_job = _v82r12_data.get("job")
                    _v82r12_lease = _v82r12_data.get("lease_token")
                    if isinstance(_v82r12_job, dict) and _v82r12_job.get("id") is not None and _v82r12_lease:
                        _v82r12_authoritative_job_id = _v82r12_job.get("id")
                        _v82r12_authoritative_lease_token = _v82r12_lease
                        _v82r12_state = "job"
                    elif _v82r12_data.get("id") is not None and _v82r12_data.get("lease_token"):
                        _v82r12_authoritative_job_id = _v82r12_data.get("id")
                        _v82r12_authoritative_lease_token = _v82r12_data.get("lease_token")
                        _v82r12_state = "job"
            if _v82r12_state == "idle":
                time.sleep(min(max(_v82r12_poll_after, 1.0), 30.0))
                continue
            if _v82r12_state == "job":
                job_id = _v82r12_authoritative_job_id
                lease_token = _v82r12_authoritative_lease_token
            if job_id is None or not lease_token:
                raise RuntimeError("Claim response lacks job_id or lease_token")
            context.update({
                "job_id": job_id,
                "lease_token": lease_token,
                "mode": mode,
                "digital_file_id": digital_file_id,
                "file_id": digital_file_id,
                "pipeline_id": pipeline_id,
                "pathname": pathname,
            })
            hb_payload = _semantic_payload(request_keys["heartbeat"], context, "heartbeat")
            heartbeat = _Heartbeat(_materialize_job_endpoint(endpoint['heartbeat'], job_id), worker_id, credential, hb_payload)
            heartbeat.start()
            started = time.time()
            temp_path = None
            try:
                raw = _obtain_source(frontend, worker_id, credential, context, job)
                suffix = ".pdf" if raw.startswith(b"%PDF") else ".bin"
                fd, temp_path = tempfile.mkstemp(prefix="qlklt_ocr_", suffix=suffix)
                try:
                    with os.fdopen(fd, "wb") as handle:
                        handle.write(raw)
                except Exception:
                    try:
                        os.close(fd)
                    except Exception:
                        pass
                    raise
                text, engine, metadata = _run_local_ocr(local_api_root, temp_path, mode, job)
                elapsed = int((time.time() - started) * 1000)
                context.update({"text": text, "engine": engine, "metadata": metadata, "processing_ms": elapsed})
                complete_payload = _semantic_payload(request_keys["complete"], context, "complete")
                complete_status, _ = _request_json("POST", _materialize_job_endpoint(endpoint['complete'], job_id), worker_id, credential, complete_payload)
                if complete_status not in (200, 201, 204):
                    raise RuntimeError("Complete endpoint rejected status=" + str(complete_status))
                _log("completed job=" + str(job_id) + " mode=" + mode + " chars=" + str(len(text)))
            except Exception as exc:
                _v82r14_original_error = exc.__class__.__name__ + ": " + str(exc)[:500]
                _v82r14_original_log = _v82r14_original_error
                for _v82r14_scheme in ("https://", "http://"):
                    _v82r14_pos = _v82r14_original_log.find(_v82r14_scheme)
                    if _v82r14_pos >= 0:
                        _v82r14_original_log = _v82r14_original_log[:_v82r14_pos] + "[URL_REDACTED]"
                _log("job-processing error=" + _v82r14_original_log)
                context.update({"error": _v82r14_original_error, "retryable": True})
                try:
                    fail_payload = _semantic_payload(request_keys["fail"], context, "fail")
                    fail_status, _ = _request_json("POST", _materialize_job_endpoint(endpoint['fail'], job_id), worker_id, credential, fail_payload)
                    _log("failed job=" + str(job_id) + " mode=" + mode + " report_status=" + str(fail_status))
                except Exception as report_exc:
                    _v82r14_report_log = report_exc.__class__.__name__ + ": " + str(report_exc)[:500]
                    for _v82r14_scheme in ("https://", "http://"):
                        _v82r14_pos = _v82r14_report_log.find(_v82r14_scheme)
                        if _v82r14_pos >= 0:
                            _v82r14_report_log = _v82r14_report_log[:_v82r14_pos] + "[URL_REDACTED]"
                    _log("failure-report transport error=" + _v82r14_report_log)
            finally:
                heartbeat.stop()
                if temp_path:
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
        except Exception as exc:
            _log("loop error=" + exc.__class__.__name__ + ": " + str(exc)[:500])
            time.sleep(POLL_SECONDS + random.random())


def main() -> int:
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--contract-root", default="")
    parser.add_argument("--local-api-root", default="")
    args = parser.parse_args()
    contract_root = Path(args.contract_root).resolve() if args.contract_root else _contract_root()
    local_api_root = Path(args.local_api_root).resolve() if args.local_api_root else _local_api_root()
    if args.self_test:
        return _self_test(contract_root, local_api_root)
    return _run_forever(contract_root, local_api_root)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
    except Exception as exc:
        _log("fatal=" + exc.__class__.__name__ + ": " + str(exc)[:700])
        raise SystemExit(2)