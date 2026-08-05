import json
import os
import subprocess
from pathlib import Path
from typing import Any

from django.conf import settings


def _find_json_payload(stdout: str) -> dict[str, Any]:
    lines = stdout.splitlines()

    for line in reversed(lines):
        line = line.strip()

        if not line:
            continue

        if line.startswith("{") and line.endswith("}"):
            return json.loads(line)

    raise RuntimeError(
        "Worker không trả JSON hợp lệ. STDOUT: "
        + stdout[-2000:]
    )


def run_paddle_ocr_worker(
    pdf_path: str,
    language: str = "vi",
    dpi: int = 300,
    timeout_seconds: int = 1800,
    vietocr_model: str = "vgg_transformer",
) -> dict[str, Any]:
    base_dir = Path(settings.BASE_DIR)

    worker_python = base_dir / ".venv_ocr_paddle" / "Scripts" / "python.exe"
    worker_script = base_dir / "scripts" / "paddle_ocr_worker.py"

    if not worker_python.exists():
        raise RuntimeError(f"Không tìm thấy Python OCR worker: {worker_python}")

    if not worker_script.exists():
        raise RuntimeError(f"Không tìm thấy script OCR worker: {worker_script}")

    pdf_file = Path(pdf_path)

    if not pdf_file.exists():
        raise RuntimeError(f"PDF không tồn tại: {pdf_file}")

    env = os.environ.copy()
    env["KMP_DUPLICATE_LIB_OK"] = "TRUE"
    env["FLAGS_use_mkldnn"] = "0"
    env["OMP_NUM_THREADS"] = "1"
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"

    command = [
        str(worker_python),
        str(worker_script),
        "--pdf",
        str(pdf_file),
        "--language",
        language or "vi",
        "--dpi",
        str(dpi or 300),
        "--vietocr-model",
        vietocr_model or "vgg_transformer",
    ]

    completed = subprocess.run(
        command,
        cwd=str(base_dir),
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout_seconds,
    )

    if completed.returncode != 0:
        raise RuntimeError(
            "Paddle/VietOCR worker chạy lỗi. "
            f"Return code: {completed.returncode}\n"
            f"STDOUT:\n{completed.stdout[-4000:]}\n"
            f"STDERR:\n{completed.stderr[-4000:]}"
        )

    payload = _find_json_payload(completed.stdout)

    if not payload.get("success"):
        raise RuntimeError(
            payload.get("error")
            or "Worker OCR trả success=false nhưng không có error."
        )

    return payload
