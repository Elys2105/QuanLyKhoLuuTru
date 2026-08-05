# -*- coding: utf-8 -*-
from __future__ import annotations

import re
import unicodedata


def clean_ocr_text(text: str) -> str:
    """
    Sửa lỗi vặt sau OCR.
    Không sửa mạnh nội dung hành chính.
    Chủ yếu sửa:
    - 2025 ? 2030 -> 2025 - 2030
    - ?Vì biển đảo? -> "Vì biển đảo"
    - spacing dấu câu
    """
    if not text:
        return text

    text = unicodedata.normalize("NFC", str(text))
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00a0", " ")

    lines = []

    for raw in text.split("\n"):
        line = unicodedata.normalize("NFC", raw)

        # Dọn khoảng trắng cơ bản
        line = re.sub(r"[ \t]+", " ", line).strip()

        # 2025 ? 2030 / 2025?2030 -> 2025 - 2030
        line = re.sub(r"(\b\d{4})\s*\?\s*(\d{4}\b)", r"\1 - \2", line)

        # Các dấu gạch ngang unicode cũng chuẩn về " - " trong khoảng năm
        line = re.sub(r"(\b\d{4})\s*[–—−]\s*(\d{4}\b)", r"\1 - \2", line)

        # nhiệm kỳ 2025 ? 2030 -> nhiệm kỳ 2025 - 2030
        line = re.sub(
            r"(nhiệm\s+kỳ\s+\d{4})\s*\?\s*(\d{4})",
            r"\1 - \2",
            line,
            flags=re.IGNORECASE,
        )

        # giai đoạn 2025 ? 2030 -> giai đoạn 2025 - 2030
        line = re.sub(
            r"(giai\s+đoạn\s+\d{4})\s*\?\s*(\d{4})",
            r"\1 - \2",
            line,
            flags=re.IGNORECASE,
        )

        # ?Vì biển đảo quê hương - Vì tuyến đầu Tổ quốc? -> "..."
        # Chỉ sửa khi có cặp ? trong cùng dòng, đoạn giữa không quá dài.
        line = re.sub(
            r"(^|[\s(:;,\-])\?([^?\n]{2,140})\?($|[\s,.;:)\-])",
            lambda m: f'{m.group(1)}"{m.group(2).strip()}"{m.group(3)}',
            line,
        )

        # Sửa khoảng trắng trước dấu câu
        line = re.sub(r"\s+([,.;:])", r"\1", line)

        # Sửa thiếu khoảng trắng sau dấu câu nếu sau đó là chữ
        line = re.sub(r"([,.;:])(?=[^\s\d])", r"\1 ", line)

        # -35 công văn -> - 35 công văn
        line = re.sub(r"^-\s*(\d+)\s+", r"- \1 ", line)

        # Các cụm mã hành chính: chỉ chuẩn khoảng trắng quanh dấu - khi nằm giữa số/mã
        line = re.sub(r"(\d{2})\s*-\s*([A-ZĐ]{2,})", r"\1-\2", line)
        line = re.sub(r"([A-ZĐ]{2,})\s*-\s*([A-ZĐ]{2,})", r"\1-\2", line)

        # Dọn lại nhiều khoảng trắng
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
