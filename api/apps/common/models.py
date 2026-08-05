from django.db import models


class BaseModel(models.Model):
    """
    BaseModel là model nền cho hầu hết bảng nghiệp vụ trong hệ thống.

    Các bảng như phông, mục lục, hộp, hồ sơ, tài liệu, file, audit...
    sau này nên kế thừa BaseModel để có sẵn:
    - created_at: thời điểm tạo
    - updated_at: thời điểm cập nhật cuối
    - is_deleted: xóa mềm
    """

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Thời điểm tạo",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        verbose_name="Thời điểm cập nhật",
    )
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Đã xóa mềm",
    )

    class Meta:
        abstract = True