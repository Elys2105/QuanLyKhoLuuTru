import mimetypes
import os
import uuid
import re

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import BaseModel
from apps.common.validators import validate_file_size


ALLOWED_DIGITAL_FILE_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
}

DIGITAL_FILE_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

DIGITAL_FILE_TYPE_LABELS = {
    "pdf": "PDF",
    "word": "Word",
    "excel": "Excel",
    "unknown": "Không rõ",
}


def get_file_extension(filename: str | None) -> str:
    if not filename:
        return ""

    return os.path.splitext(filename)[1].lower()


def get_digital_file_kind(filename: str | None) -> str:
    extension = get_file_extension(filename)

    if extension == ".pdf":
        return "pdf"

    if extension in {".doc", ".docx"}:
        return "word"

    if extension in {".xls", ".xlsx"}:
        return "excel"

    return "unknown"


def get_digital_file_mime_type(
    filename: str | None,
    fallback: str | None = None,
) -> str:
    extension = get_file_extension(filename)

    if extension in DIGITAL_FILE_MIME_TYPES:
        return DIGITAL_FILE_MIME_TYPES[extension]

    guessed_type, _ = mimetypes.guess_type(filename or "")

    return guessed_type or fallback or "application/octet-stream"


def validate_digital_file_type(uploaded_file):
    filename = getattr(uploaded_file, "name", "") or ""
    extension = get_file_extension(filename)

    if extension not in ALLOWED_DIGITAL_FILE_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_DIGITAL_FILE_EXTENSIONS))
        raise ValidationError(
            f"Chỉ hỗ trợ file PDF/Word/Excel: {allowed}."
        )



def _safe_storage_filename(filename: str, max_base_length: int = 50) -> str:
    """
    Rút gọn tên file lưu vật lý để tránh vượt max_length/path length.
    Tên gốc đầy đủ vẫn lưu ở DigitalFile.original_name.
    """
    original_name = os.path.basename(filename or "file")
    base, ext = os.path.splitext(original_name)

    ext = (ext or "").lower()
    base = re.sub(r"[^0-9A-Za-z._-]+", "_", base, flags=re.UNICODE)
    base = base.strip("._-") or "file"

    if len(base) > max_base_length:
        base = base[:max_base_length].rstrip("._-") or "file"

    token = uuid.uuid4().hex[:12]

    return f"{base}_{token}{ext}"


def profile_pdf_upload_path(instance, filename):
    profile_id = getattr(instance, "profile_id", None) or "unknown"
    extension = os.path.splitext(filename or "")[1].lower().lstrip(".") or "file"

    if extension in {"doc", "docx"}:
        folder = "word"
    elif extension in {"xls", "xlsx"}:
        folder = "excel"
    elif extension == "pdf":
        folder = "pdf"
    else:
        folder = "files"

    safe_name = _safe_storage_filename(filename)

    return f"profile_files/profile_{profile_id}/{folder}/{safe_name}"

class DigitalFile(BaseModel):
    """
    File số hóa đính kèm hồ sơ.

    WEB-25 hỗ trợ:
    - PDF: upload, preview, download, OCR như hiện tại.
    - Word: upload, download.
    - Excel: upload, download.
    """

    profile = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.CASCADE,
        related_name="digital_files",
        verbose_name="Hồ sơ",
    )
    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        related_name="digital_files",
        null=True,
        blank=True,
        verbose_name="Thành phần hồ sơ",
    )
    file = models.FileField(
        max_length=500,
        upload_to=profile_pdf_upload_path,
        validators=[validate_file_size, validate_digital_file_type],
        verbose_name="File số hóa",
    )
    original_name = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Tên file gốc",
    )
    file_size = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        verbose_name="Dung lượng file",
    )
    mime_type = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Loại file",
    )
    page_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Số trang PDF",
    )
    is_primary = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="File chính",
    )

    class Meta:
        db_table = "digital_files"
        verbose_name = "File số hóa"
        verbose_name_plural = "File số hóa"
        ordering = ["profile", "-is_primary", "id"]

    @property
    def file_extension(self) -> str:
        return get_file_extension(self.original_name or self.file.name)

    @property
    def file_type(self) -> str:
        return get_digital_file_kind(self.original_name or self.file.name)

    @property
    def file_type_label(self) -> str:
        return DIGITAL_FILE_TYPE_LABELS.get(self.file_type, "Không rõ")

    @property
    def is_pdf(self) -> bool:
        return self.file_type == "pdf"

    @property
    def is_word(self) -> bool:
        return self.file_type == "word"

    @property
    def is_excel(self) -> bool:
        return self.file_type == "excel"

    @property
    def can_preview_inline(self) -> bool:
        return self.is_pdf

    def save(self, *args, **kwargs):
        if self.file:
            if not self.original_name:
                self.original_name = os.path.basename(self.file.name)

            if hasattr(self.file, "size"):
                self.file_size = self.file.size

            uploaded_content_type = getattr(
                getattr(self.file, "file", None),
                "content_type",
                None,
            )

            self.mime_type = get_digital_file_mime_type(
                self.original_name or self.file.name,
                uploaded_content_type,
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return self.original_name or str(self.file)