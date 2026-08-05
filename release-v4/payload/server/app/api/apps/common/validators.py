import os

from django.conf import settings
from django.core.exceptions import ValidationError


def validate_file_size(file):
    """
    Kiểm tra dung lượng file upload.
    """

    max_size_mb = getattr(settings, "MAX_UPLOAD_SIZE_MB", 100)
    max_size_bytes = max_size_mb * 1024 * 1024

    if file.size > max_size_bytes:
        raise ValidationError(
            f"File vượt quá dung lượng cho phép {max_size_mb}MB"
        )


def validate_pdf_file(file):
    """
    Kiểm tra file có phải PDF không.
    """

    ext = os.path.splitext(file.name)[1].lower()

    if ext != ".pdf":
        raise ValidationError("Chỉ cho phép upload file PDF")


def validate_excel_file(file):
    """
    Kiểm tra file có phải Excel không.
    """

    ext = os.path.splitext(file.name)[1].lower()

    if ext not in [".xlsx", ".xls"]:
        raise ValidationError("Chỉ cho phép upload file Excel")