from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN = "LOGIN", "Đăng nhập"
        LOGOUT = "LOGOUT", "Đăng xuất"

        CREATE = "CREATE", "Thêm mới"
        UPDATE = "UPDATE", "Cập nhật"
        DELETE = "DELETE", "Xóa"

        UPLOAD_PDF = "UPLOAD_PDF", "Upload PDF"
        PREVIEW_PDF = "PREVIEW_PDF", "Xem PDF"
        DOWNLOAD_PDF = "DOWNLOAD_PDF", "Tải PDF"

        IMPORT_EXCEL = "IMPORT_EXCEL", "Import Excel"
        EXPORT_EXCEL = "EXPORT_EXCEL", "Export Excel"
        EXPORT_PDF = "EXPORT_PDF", "Export PDF"

        SEARCH = "SEARCH", "Tìm kiếm"
        VIEW_DASHBOARD = "VIEW_DASHBOARD", "Xem dashboard"
        VIEW_TREE = "VIEW_TREE", "Xem cây lưu trữ"

        API_CALL = "API_CALL", "Gọi API"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="Người dùng",
    )

    username = models.CharField(
        max_length=150,
        blank=True,
        default="",
        verbose_name="Tên đăng nhập",
    )

    action = models.CharField(
        max_length=50,
        choices=Action.choices,
        verbose_name="Hành động",
    )

    method = models.CharField(
        max_length=10,
        blank=True,
        default="",
        verbose_name="HTTP method",
    )

    path = models.CharField(
        max_length=500,
        verbose_name="Đường dẫn API",
    )

    status_code = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="HTTP status",
    )

    object_type = models.CharField(
        max_length=150,
        blank=True,
        default="",
        verbose_name="Loại đối tượng",
    )

    object_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="ID đối tượng",
    )

    object_repr = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Mô tả đối tượng",
    )

    request_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Dữ liệu request",
    )

    response_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Dữ liệu response",
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Địa chỉ IP",
    )

    user_agent = models.TextField(
        blank=True,
        default="",
        verbose_name="User Agent",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Thời điểm",
    )

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["action"]),
            models.Index(fields=["username"]),
            models.Index(fields=["path"]),
            models.Index(fields=["status_code"]),
        ]
        verbose_name = "Nhật ký hệ thống"
        verbose_name_plural = "Nhật ký hệ thống"

    def __str__(self):
        return f"{self.created_at} - {self.username} - {self.action} - {self.path}"