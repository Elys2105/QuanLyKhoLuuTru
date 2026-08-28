import uuid
from django.conf import settings
from django.db import models


class OcrJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Đang chờ"
        RUNNING = "RUNNING", "Đang xử lý"
        COMPLETED = "COMPLETED", "Hoàn thành"
        FAILED = "FAILED", "Thất bại"

    class Mode(models.TextChoices):
        FAST = "fast", "Nhanh"
        QUALITY = "quality", "Chất lượng cao"

    digital_file = models.ForeignKey(
        "files.DigitalFile",
        on_delete=models.CASCADE,
        related_name="ocr_jobs",
        verbose_name="File số hóa",
    )

    profile = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ocr_jobs",
        verbose_name="Hồ sơ",
    )

    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ocr_jobs",
        verbose_name="Thành phần tài liệu",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_ocr_jobs",
        verbose_name="Người chạy OCR",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Trạng thái",
    )

    ocr_mode = models.CharField(
        max_length=20,
        choices=Mode.choices,
        default=Mode.FAST,
        verbose_name="Chế độ OCR",
    )

    pipeline_id = models.UUIDField(
        null=True,
        blank=True,
        editable=False,
        verbose_name="Pipeline OCR",
    )

    lease_owner = models.CharField(
        max_length=128,
        blank=True,
        default="",
        verbose_name="Worker đang giữ lease",
    )

    lease_token = models.UUIDField(
        null=True,
        blank=True,
        editable=False,
        verbose_name="Lease token",
    )

    lease_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Lease hết hạn",
    )

    heartbeat_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Heartbeat gần nhất",
    )

    attempt_count = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Số lần đã claim",
    )

    max_attempts = models.PositiveSmallIntegerField(
        default=3,
        verbose_name="Số lần thử tối đa",
    )

    next_retry_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Cho phép retry từ",
    )

    current_page = models.PositiveIntegerField(
        default=0,
        verbose_name="Trang hiện tại",
    )

    progress_percent = models.PositiveIntegerField(
        default=0,
        verbose_name="Tiến trình %",
    )

    engine = models.CharField(
        max_length=100,
        blank=True,
        default="paddle",
        verbose_name="Công cụ OCR",
    )

    language = models.CharField(
        max_length=50,
        blank=True,
        default="vi",
        verbose_name="Ngôn ngữ OCR",
    )

    page_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Số trang",
    )

    character_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Số ký tự",
    )

    extracted_text = models.TextField(
        blank=True,
        default="",
        verbose_name="Text OCR",
    )

    normalized_text = models.TextField(
        blank=True,
        default="",
        verbose_name="Text OCR chuẩn hóa",
    )

    error_message = models.TextField(
        blank=True,
        default="",
        verbose_name="Lỗi",
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Bắt đầu",
    )

    finished_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Kết thúc",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Ngày tạo",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Ngày cập nhật",
    )

    class Meta:
        db_table = "ocr_jobs"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["ocr_mode"]),
            models.Index(fields=["digital_file"]),
            models.Index(fields=["profile"]),
            models.Index(fields=["document"]),
            models.Index(fields=["created_at"]),
            models.Index(
                fields=["status", "next_retry_at"],
                name="ocr_jobs_status_retry_idx",
            ),
            models.Index(
                fields=["pipeline_id", "ocr_mode"],
                name="ocr_jobs_pipe_mode_idx",
            ),
            models.Index(
                fields=["lease_expires_at"],
                name="ocr_jobs_lease_exp_idx",
            ),
        ]
        verbose_name = "OCR job"
        verbose_name_plural = "OCR jobs"

    def __str__(self):
        return f"OCR #{self.id} - file {self.digital_file_id} - {self.ocr_mode} - {self.status}"
