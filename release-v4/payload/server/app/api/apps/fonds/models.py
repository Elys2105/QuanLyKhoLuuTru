from django.db import models

from apps.common.models import BaseModel


class Fond(BaseModel):
    """
    Phông lưu trữ.

    Ví dụ:
    - UBND xã A
    - Phòng Nội vụ huyện B
    - Sở Tài chính tỉnh C
    """

    code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name="Mã phông",
    )
    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Tên phông",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Mô tả",
    )

    class Meta:
        db_table = "fonds"
        verbose_name = "Phông lưu trữ"
        verbose_name_plural = "Phông lưu trữ"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"