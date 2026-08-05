# -*- coding: utf-8 -*-

import json
import re
import unicodedata


def clean_ocr_text(text: str) -> str:
    if not text:
        return text

    text = unicodedata.normalize("NFC", str(text))
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00a0", " ")

    lines = []

    for raw in text.split("\n"):
        line = unicodedata.normalize("NFC", raw)
        line = re.sub(r"[ \t]+", " ", line).strip()

        # 2025 ? 2030 -> 2025 - 2030
        line = re.sub(r"(\b\d{4})\s*\?\s*(\d{4}\b)", r"\1 - \2", line)

        # Dấu gạch ngang unicode trong khoảng năm
        line = re.sub(r"(\b\d{4})\s*[–—−]\s*(\d{4}\b)", r"\1 - \2", line)

        # ?abc? -> "abc" nếu là một cặp ngắn trong cùng dòng
        line = re.sub(
            r"(^|[\s(:;,\-])\?([^?\n]{2,140})\?($|[\s,.;:)\-])",
            lambda m: f'{m.group(1)}"{m.group(2).strip()}"{m.group(3)}',
            line,
        )

        line = re.sub(r"\s+([,.;:])", r"\1", line)
        line = re.sub(r"([,.;:])(?=[^\s\d])", r"\1 ", line)
        line = re.sub(r"^-\s*(\d+)\s+", r"- \1 ", line)
        line = re.sub(r"[ \t]{2,}", " ", line).strip()

        lines.append(line)

    result = "\n".join(lines)
    result = re.sub(r"\n{4,}", "\n\n\n", result)

    replacements = {
        "ĐẢNG UY": "ĐẢNG ỦY",
        "Đảng uy": "Đảng ủy",
        "đảng uy": "đảng ủy",
        "VPDU": "VPĐU",
        "VPD U": "VPĐU",
    }

    for bad, good in replacements.items():
        result = result.replace(bad, good)

    return result.strip()


def _clean_json_node(node):
    changed = False

    if isinstance(node, dict):
        for key in ("extracted_text", "best_text", "text"):
            value = node.get(key)
            if isinstance(value, str):
                cleaned = clean_ocr_text(value)
                if cleaned != value:
                    node[key] = cleaned
                    changed = True

                    if key == "extracted_text" and "character_count" in node:
                        node["character_count"] = len(cleaned)

        for value in node.values():
            child_changed = _clean_json_node(value)
            changed = changed or child_changed

    elif isinstance(node, list):
        for item in node:
            child_changed = _clean_json_node(item)
            changed = changed or child_changed

    return changed


class JsonUtf8CharsetMiddleware:
    """
    1. Ép JSON response có charset=utf-8.
    2. Với API OCR, sửa lỗi OCR vặt trong response:
       2025 ? 2030 -> 2025 - 2030.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        content_type = response.get("Content-Type", "")

        if content_type.startswith("application/json"):
            response["Content-Type"] = "application/json; charset=utf-8"

            # Chỉ xử lý JSON OCR thường, bỏ qua streaming/file response.
            if request.path.startswith("/api/ocr/") and hasattr(response, "content"):
                try:
                    raw = response.content.decode("utf-8")
                    data = json.loads(raw)

                    changed = _clean_json_node(data)

                    if changed:
                        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
                        response.content = body
                        response["Content-Length"] = str(len(body))

                except Exception:
                    pass

        return response
