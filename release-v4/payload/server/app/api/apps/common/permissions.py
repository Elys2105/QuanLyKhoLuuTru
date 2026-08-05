from rest_framework.permissions import BasePermission


class IsAdminOrReadOnly(BasePermission):
    """
    Admin được sửa.
    User thường chỉ được xem.
    """

    def has_permission(self, request, view):
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return request.user and request.user.is_authenticated

        return request.user and request.user.is_staff


class IsSuperUser(BasePermission):
    """
    Chỉ superuser được phép truy cập.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)