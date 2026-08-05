from rest_framework.permissions import BasePermission


class CanViewAuditLog(BasePermission):
    """
    Chỉ ADMIN/MANAGER hoặc superuser/staff được xem audit log.

    VIEWER/STAFF thường không nên xem nhật ký hệ thống.
    """

    message = "Bạn không có quyền xem nhật ký hệ thống."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if user.is_staff:
            return True

        user_groups = set(user.groups.values_list("name", flat=True))

        return bool(user_groups.intersection({"ADMIN", "MANAGER"}))