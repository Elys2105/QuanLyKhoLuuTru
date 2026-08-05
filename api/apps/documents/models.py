from django.db import models

from apps.common.models import BaseModel
from apps.common.utils import normalize_search_text


class Document(BaseModel):
    """
    Bản ghi/Văn bản thuộc một hồ sơ.

    Một hồ sơ có nhiều bản ghi. File số hóa, OCR và metadata chi tiết
    sẽ gắn trực tiếp vào bản ghi.
    """

    profile = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.PROTECT,
        related_name="documents",
        verbose_name="Hồ sơ",
    )

    document_identifier = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Mã định danh tài liệu",
    )
    order_in_profile = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Số thứ tự văn bản trong hồ sơ",
    )

    document_code = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Số/ký hiệu văn bản",
    )
    document_number = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Số văn bản",
    )
    document_symbol = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Ký hiệu văn bản",
    )

    document_type = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Tên thể loại văn bản",
    )
    title = models.CharField(
        max_length=1000,
        db_index=True,
        verbose_name="Tiêu đề/Tên gọi văn bản",
    )
    summary = models.TextField(
        blank=True,
        verbose_name="Trích yếu nội dung",
    )
    document_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Ngày/tháng/năm văn bản",
    )

    author = models.CharField(
        max_length=500,
        blank=True,
        db_index=True,
        verbose_name="Tác giả/Cơ quan ban hành",
    )
    signer = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Người ký",
    )

    copy_type = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Loại bản",
    )
    language = models.CharField(
        max_length=100,
        blank=True,
        default="Tiếng Việt",
        verbose_name="Ngôn ngữ",
    )
    security_level = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Độ mật",
    )

    page_start = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Trang bắt đầu",
    )
    page_end = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Trang kết thúc",
    )
    page_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Số lượng trang",
    )
    page_number = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Trang số",
    )

    attachment_note = models.CharField(
        max_length=1000,
        blank=True,
        verbose_name="Tệp/tập tin đính kèm văn bản",
    )
    digital_signature = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Chữ ký số",
    )

    note = models.TextField(
        blank=True,
        verbose_name="Ghi chú",
    )
    search_text = models.TextField(
        blank=True,
        db_index=True,
        verbose_name="Text tìm kiếm chuẩn hóa",
    )

    class Meta:
        db_table = "documents"
        verbose_name = "Bản ghi"
        verbose_name_plural = "Bản ghi"
        ordering = ["profile", "order_in_profile", "document_date", "document_code"]
        indexes = [
            models.Index(fields=["document_identifier"]),
            models.Index(fields=["document_code"]),
            models.Index(fields=["document_number"]),
            models.Index(fields=["document_symbol"]),
            models.Index(fields=["document_type"]),
            models.Index(fields=["title"]),
            models.Index(fields=["document_date"]),
            models.Index(fields=["author"]),
            models.Index(fields=["signer"]),
            models.Index(fields=["security_level"]),
            models.Index(fields=["search_text"]),
        ]

    def save(self, *args, **kwargs):
        raw_text = " ".join(
            [
                self.document_identifier or "",
                str(self.order_in_profile or ""),
                self.document_code or "",
                self.document_number or "",
                self.document_symbol or "",
                self.document_type or "",
                self.title or "",
                self.summary or "",
                self.author or "",
                self.signer or "",
                self.copy_type or "",
                self.language or "",
                self.security_level or "",
                self.page_number or "",
                self.attachment_note or "",
                self.digital_signature or "",
                self.note or "",
            ]
        )
        self.search_text = normalize_search_text(raw_text)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.document_code} - {self.title}"