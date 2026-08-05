from django.contrib.auth.models import Group

from apps.permissions.constants import (
    ALL_ROLES,
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_VIEWER,
)


def create_default_roles():
    """
    Tạo sẵn 4 nhóm quyền mặc định:
    - ADMIN
    - MANAGER
    - STAFF
    - VIEWER
    """

    result = []

    for role_name in ALL_ROLES:
        group, created = Group.objects.get_or_create(name=role_name)

        result.append(
            {
                "name": group.name,
                "created": created,
            }
        )

    return result


def get_user_role_names(user):
    """
    Lấy danh sách role của user.
    """

    if not user or not user.is_authenticated:
        return []

    return list(user.groups.values_list("name", flat=True))


def user_has_role(user, role_name):
    """
    Kiểm tra user có thuộc role cụ thể không.
    """

    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return user.groups.filter(name=role_name).exists()


def user_has_any_role(user, role_names):
    """
    Kiểm tra user có thuộc ít nhất một role trong danh sách không.
    """

    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return user.groups.filter(name__in=role_names).exists()


def is_admin(user):
    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
        ],
    )


def is_manager(user):
    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
        ],
    )


def is_staff_role(user):
    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
            ROLE_STAFF,
        ],
    )


def can_view_archive(user):
    """
    Quyền xem/tra cứu dữ liệu kho lưu trữ.
    """

    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
            ROLE_STAFF,
            ROLE_VIEWER,
        ],
    )


def can_edit_archive(user):
    """
    Quyền thêm/sửa dữ liệu nghiệp vụ.
    """

    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
            ROLE_STAFF,
        ],
    )


def can_delete_archive(user):
    """
    Quyền xóa mềm dữ liệu.
    """

    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
        ],
    )


def can_upload_digital_file(user):
    """
    Quyền upload/sửa PDF.
    """

    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
            ROLE_STAFF,
        ],
    )


def can_view_digital_file(user):
    """
    Quyền preview/download PDF.
    """

    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
            ROLE_STAFF,
            ROLE_VIEWER,
        ],
    )


def can_import_data(user):
    """
    Quyền import Excel.
    """

    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
        ],
    )


def can_export_report(user):
    """
    Quyền export Excel/PDF và xem dashboard.
    """

    return user_has_any_role(
        user,
        [
            ROLE_ADMIN,
            ROLE_MANAGER,
        ],
    )