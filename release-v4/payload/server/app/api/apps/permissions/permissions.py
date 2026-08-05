from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.permissions.constants import (
    DELETE_ACTIONS,
    PDF_ACTIONS,
    READ_ACTIONS,
    WRITE_ACTIONS,
)
from apps.permissions.services import (
    can_delete_archive,
    can_edit_archive,
    can_export_report,
    can_import_data,
    can_upload_digital_file,
    can_view_archive,
    can_view_digital_file,
    is_admin,
    is_manager,
    is_staff_role,
)


class IsAdmin(BasePermission):
    """
    Chỉ ADMIN hoặc superuser.
    """

    message = "Bạn cần quyền ADMIN để thực hiện thao tác này."

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsManager(BasePermission):
    """
    ADMIN hoặc MANAGER.
    """

    message = "Bạn cần quyền MANAGER để thực hiện thao tác này."

    def has_permission(self, request, view):
        return is_manager(request.user)


class IsStaff(BasePermission):
    """
    ADMIN, MANAGER hoặc STAFF.
    """

    message = "Bạn cần quyền STAFF để thực hiện thao tác này."

    def has_permission(self, request, view):
        return is_staff_role(request.user)


class CanViewArchive(BasePermission):
    """
    Quyền xem/tra cứu dữ liệu lưu trữ.
    ADMIN, MANAGER, STAFF, VIEWER đều được xem.
    """

    message = "Bạn không có quyền xem dữ liệu lưu trữ."

    def has_permission(self, request, view):
        return can_view_archive(request.user)


class CanEditArchive(BasePermission):
    """
    Quyền thêm/sửa dữ liệu lưu trữ.
    ADMIN, MANAGER, STAFF được thêm/sửa.
    """

    message = "Bạn không có quyền thêm hoặc sửa dữ liệu lưu trữ."

    def has_permission(self, request, view):
        return can_edit_archive(request.user)


class CanUploadDigitalFile(BasePermission):
    """
    Quyền upload/sửa file PDF.
    ADMIN, MANAGER, STAFF được upload.
    """

    message = "Bạn không có quyền upload file số hóa."

    def has_permission(self, request, view):
        return can_upload_digital_file(request.user)


class CanExportReport(BasePermission):
    """
    Quyền export báo cáo và xem dashboard.
    ADMIN, MANAGER được export/report.
    """

    message = "Bạn không có quyền xuất báo cáo."

    def has_permission(self, request, view):
        return can_export_report(request.user)


class ArchiveCRUDPermission(BasePermission):
    """
    Permission dùng cho các ViewSet CRUD nghiệp vụ.

    list/retrieve:
        ADMIN, MANAGER, STAFF, VIEWER

    create/update/partial_update:
        ADMIN, MANAGER, STAFF

    destroy:
        ADMIN, MANAGER
    """

    message = "Bạn không có quyền thực hiện thao tác này."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        action = getattr(view, "action", None)

        if action in READ_ACTIONS:
            return can_view_archive(user)

        if action in WRITE_ACTIONS:
            return can_edit_archive(user)

        if action in DELETE_ACTIONS:
            return can_delete_archive(user)

        return False


class DigitalFilePermission(BasePermission):
    """
    Permission riêng cho DigitalFile.

    list/retrieve:
        ADMIN, MANAGER, STAFF, VIEWER

    create/update/partial_update:
        ADMIN, MANAGER, STAFF

    destroy:
        ADMIN, MANAGER

    preview/download:
        ADMIN, MANAGER, STAFF, VIEWER
    """

    message = "Bạn không có quyền truy cập file số hóa."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        action = getattr(view, "action", None)

        if action in READ_ACTIONS:
            return can_view_archive(user)

        if action in WRITE_ACTIONS:
            return can_upload_digital_file(user)

        if action in DELETE_ACTIONS:
            return can_delete_archive(user)

        if action in PDF_ACTIONS:
            return can_view_digital_file(user)

        return False


class SearchPermission(BasePermission):
    """
    Quyền tìm kiếm hồ sơ.
    """

    message = "Bạn không có quyền tìm kiếm hồ sơ."

    def has_permission(self, request, view):
        return can_view_archive(request.user)


class ImportPermission(BasePermission):
    """
    Quyền import Excel.
    """

    message = "Bạn không có quyền import dữ liệu."

    def has_permission(self, request, view):
        return can_import_data(request.user)


class ExportPermission(BasePermission):
    """
    Quyền export Excel/PDF.
    """

    message = "Bạn không có quyền export dữ liệu."

    def has_permission(self, request, view):
        return can_export_report(request.user)


class ReportPermission(BasePermission):
    """
    Quyền xem dashboard/báo cáo.
    """

    message = "Bạn không có quyền xem báo cáo."

    def has_permission(self, request, view):
        return can_export_report(request.user)

class AuthenticatedReadOnlyArchivePermission(BasePermission):
    """
    Cho mọi user đã đăng nhập được xem list/retrieve.
    Các thao tác ghi vẫn theo quyền ArchiveCRUDPermission.
    Dùng cho màn khách/user chỉ xem hồ sơ và bản ghi.
    """

    message = "Bạn không có quyền thực hiện thao tác này."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        action = getattr(view, "action", None)

        if action in READ_ACTIONS:
            return True

        if action in WRITE_ACTIONS:
            return can_edit_archive(user)

        if action in DELETE_ACTIONS:
            return can_delete_archive(user)

        return False



class AuthenticatedSafeReadArchivePermission(BasePermission):
    """
    User đã đăng nhập được đọc GET/HEAD/OPTIONS.
    POST/PATCH/DELETE vẫn theo quyền sửa/xóa.
    """

    message = "Bạn không có quyền thực hiện thao tác này."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return True

        action = getattr(view, "action", None)

        if action in DELETE_ACTIONS:
            return can_delete_archive(user)

        return can_edit_archive(user)
