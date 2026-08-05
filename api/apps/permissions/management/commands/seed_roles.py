from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.permissions.constants import ROLE_ADMIN
from apps.permissions.services import create_default_roles


class Command(BaseCommand):
    help = "Tạo các nhóm quyền mặc định ADMIN, MANAGER, STAFF, VIEWER."

    def handle(self, *args, **options):
        roles = create_default_roles()

        self.stdout.write(self.style.SUCCESS("Đã kiểm tra/tạo các nhóm quyền:"))

        for role in roles:
            status = "created" if role["created"] else "exists"
            self.stdout.write(f"- {role['name']}: {status}")

        User = get_user_model()

        try:
            admin_user = User.objects.get(username="Admin")
        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING("Không tìm thấy user Admin để gán role ADMIN."))
            return

        from django.contrib.auth.models import Group

        admin_group = Group.objects.get(name=ROLE_ADMIN)
        admin_user.groups.add(admin_group)

        self.stdout.write(self.style.SUCCESS("Đã gán user Admin vào role ADMIN."))