from django.db import models

from apps.common.models import BaseModel


class Catalog(BaseModel):
    """
    Mục lục hồ sơ.

    Một phông có thể có nhiều mục lục.
    Ví dụ:
    - Mục lục hồ sơ năm 2023
    - Mục lục hồ sơ năm 2024
    """

    fond = models.ForeignKey(
        "fonds.Fond",
        on_delete=models.PROTECT,
        related_name="catalogs",
        verbose_name="Phông lưu trữ",
    )
    code = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Mã mục lục",
    )
    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Tên mục lục",
    )
    year = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Năm",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Mô tả",
    )

    class Meta:
        db_table = "catalogs"
        verbose_name = "Mục lục hồ sơ"
        verbose_name_plural = "Mục lục hồ sơ"
        ordering = ["fond", "year", "code"]
        unique_together = ["fond", "code"]

    def __str__(self):
        return f"{self.code} - {self.name}"