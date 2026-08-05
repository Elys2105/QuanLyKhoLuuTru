import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.apps import apps

print("DB_ENGINE=" + str(settings.DATABASES["default"].get("ENGINE")))
print("DB_NAME=" + str(settings.DATABASES["default"].get("NAME")))
print("DB_HOST=" + str(settings.DATABASES["default"].get("HOST")))
print("DB_PORT=" + str(settings.DATABASES["default"].get("PORT")))
print("DEBUG=" + str(settings.DEBUG))
print("ALLOWED_HOSTS=" + str(settings.ALLOWED_HOSTS))
print("MEDIA_ROOT=" + str(settings.MEDIA_ROOT))

User = get_user_model()
print("USER_TOTAL=" + str(User.objects.count()))
print("USER_ACTIVE=" + str(User.objects.filter(is_active=True).count()))
print("USER_STAFF=" + str(User.objects.filter(is_staff=True).count()))
print("USER_SUPERUSER=" + str(User.objects.filter(is_superuser=True).count()))

names = [
    "Fond", "Catalog", "Warehouse", "StorageLocation", "StorageBox",
    "StorageFile", "Profile", "Document", "DigitalFile", "OcrJob", "AuditLog"
]

for n in names:
    found = None
    for m in apps.get_models():
        if m.__name__.lower() == n.lower():
            found = m
            break

    if found is None:
        print("MODEL_COUNT|" + n + "|NOT_FOUND")
    else:
        print("MODEL_COUNT|" + n + "|" + str(found.objects.count()))
