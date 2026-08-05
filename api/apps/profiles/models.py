from django.db import models

from apps.common.models import BaseModel
from apps.common.utils import normalize_search_text


class Profile(BaseModel):
    """
    Hồ sơ lưu trữ.

    Hồ sơ là vỏ/tập hồ sơ. Một hồ sơ có nhiều bản ghi/văn bản.
    File số hóa và OCR chi tiết sẽ được gắn vào từng bản ghi ở các bước sau.
    """

    catalog = models.ForeignKey(
        "catalogs.Catalog",
        on_delete=models.PROTECT,
        related_name="profiles",
        verbose_name="Mục lục",
    )
    storage_file = models.ForeignKey(
        "storage.StorageFile",
        on_delete=models.PROTECT,
        related_name="profiles",
        null=True,
        blank=True,
        verbose_name="Tệp trong hộp",
    )

    profile_type = models.CharField(
        max_length=100,
        blank=True,
        default="Hồ sơ",
        verbose_name="Loại hồ sơ",
    )
    profile_code = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Mã hồ sơ",
    )
    file_notation = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Số và ký hiệu hồ sơ",
    )
    title = models.CharField(
        max_length=1000,
        db_index=True,
        verbose_name="Tiêu đề hồ sơ",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Nội dung/mô tả hồ sơ",
    )

    preservation_unit_number = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Đơn vị bảo quản số",
    )
    historical_archive_code = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Mã cơ quan lưu trữ lịch sử",
    )

    start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Thời gian bắt đầu",
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Thời gian kết thúc",
    )
    year = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Năm hồ sơ",
    )

    total_documents = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Tổng số tài liệu trong hồ sơ",
    )
    total_pages = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Tổng số trang trong hồ sơ",
    )

    profile_group_name = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Tên nhóm hồ sơ",
    )
    retention_period = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Thời hạn bảo quản",
    )
    physical_condition = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Tình trạng vật lý",
    )
    keywords = models.TextField(
        blank=True,
        verbose_name="Từ khóa",
    )
    topic = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Chuyên đề",
    )
    storage_position_text = models.CharField(
        max_length=1000,
        blank=True,
        verbose_name="Cấp số hoặc kho/giá/cặp số",
    )

    language = models.CharField(
        max_length=100,
        blank=True,
        default="Tiếng Việt",
        verbose_name="Ngôn ngữ",
    )
    note = models.TextField(
        blank=True,
        verbose_name="Chú thích/Ghi chú",
    )

    search_text = models.TextField(
        blank=True,
        db_index=True,
        verbose_name="Text tìm kiếm chuẩn hóa",
    )

    class Meta:
        db_table = "profiles"
        verbose_name = "Hồ sơ"
        verbose_name_plural = "Hồ sơ"
        ordering = ["catalog", "profile_code"]
        indexes = [
            models.Index(fields=["profile_code"]),
            models.Index(fields=["file_notation"]),
            models.Index(fields=["title"]),
            models.Index(fields=["year"]),
            models.Index(fields=["retention_period"]),
            models.Index(fields=["search_text"]),
        ]

    def save(self, *args, **kwargs):
        raw_text = " ".join(
            [
                self.profile_type or "",
                self.profile_code or "",
                self.file_notation or "",
                self.title or "",
                self.description or "",
                self.preservation_unit_number or "",
                self.historical_archive_code or "",
                self.profile_group_name or "",
                self.retention_period or "",
                self.physical_condition or "",
                self.keywords or "",
                self.topic or "",
                self.storage_position_text or "",
                self.language or "",
                self.note or "",
            ]
        )
        self.search_text = normalize_search_text(raw_text)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.profile_code} - {self.title}"