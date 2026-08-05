from django.db import models

from apps.common.models import BaseModel


class Warehouse(BaseModel):
    """
    Kho lưu trữ vật lý.

    Ví dụ:
    - Kho lưu trữ tầng 1
    - Kho lưu trữ huyện
    - Kho A
    """

    code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name="Mã kho",
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Tên kho",
    )
    address = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Địa chỉ",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Mô tả",
    )

    class Meta:
        db_table = "warehouses"
        verbose_name = "Kho lưu trữ"
        verbose_name_plural = "Kho lưu trữ"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class StorageLocation(BaseModel):
    """
    Vị trí trong kho.

    Ví dụ:
    - Kệ A
    - Kệ A - Tầng 2
    - Phòng 01 - Dãy B - Kệ 03
    """

    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="locations",
        verbose_name="Kho",
    )
    code = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Mã vị trí",
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Tên vị trí",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Mô tả",
    )

    class Meta:
        db_table = "storage_locations"
        verbose_name = "Vị trí lưu trữ"
        verbose_name_plural = "Vị trí lưu trữ"
        ordering = ["warehouse", "code"]
        unique_together = ["warehouse", "code"]

    def __str__(self):
        return f"{self.warehouse.code} / {self.code}"


class StorageBox(BaseModel):
    """
    Hộp lưu trữ.

    Đây là bảng rất quan trọng vì yêu cầu chính của khách hàng là:
    tìm hồ sơ nằm trong hộp số mấy.
    """

    location = models.ForeignKey(
        StorageLocation,
        on_delete=models.PROTECT,
        related_name="boxes",
        verbose_name="Vị trí lưu trữ",
    )
    fond = models.ForeignKey(
        "fonds.Fond",
        on_delete=models.PROTECT,
        related_name="boxes",
        verbose_name="Phông lưu trữ",
    )
    catalog = models.ForeignKey(
        "catalogs.Catalog",
        on_delete=models.PROTECT,
        related_name="boxes",
        null=True,
        blank=True,
        verbose_name="Mục lục",
    )
    box_number = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Hộp số",
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Tiêu đề hộp",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Mô tả",
    )

    class Meta:
        db_table = "storage_boxes"
        verbose_name = "Hộp lưu trữ"
        verbose_name_plural = "Hộp lưu trữ"
        ordering = ["fond", "box_number"]
        unique_together = ["fond", "box_number"]

    def __str__(self):
        return f"Hộp {self.box_number}"


class StorageFile(BaseModel):
    """
    Tệp/cặp nằm trong hộp.

    Một hộp có nhiều tệp.
    Một tệp chứa nhiều hồ sơ.
    """

    box = models.ForeignKey(
        StorageBox,
        on_delete=models.PROTECT,
        related_name="storage_files",
        verbose_name="Hộp",
    )
    file_number = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Tệp số",
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Tiêu đề tệp",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Mô tả",
    )

    class Meta:
        db_table = "storage_files"
        verbose_name = "Tệp trong hộp"
        verbose_name_plural = "Tệp trong hộp"
        ordering = ["box", "file_number"]
        unique_together = ["box", "file_number"]

    def __str__(self):
        return f"Hộp {self.box.box_number} / Tệp {self.file_number}"