from django.conf import settings
from django.apps import apps
from django.contrib.auth import get_user_model
import os

print("DB_ENGINE=" + str(settings.DATABASES.get("default", {}).get("ENGINE", "")))
print("DB_NAME=" + str(settings.DATABASES.get("default", {}).get("NAME", "")))
print("DB_HOST=" + str(settings.DATABASES.get("default", {}).get("HOST", "")))
print("DB_PORT=" + str(settings.DATABASES.get("default", {}).get("PORT", "")))
print("MEDIA_ROOT=" + str(getattr(settings, "MEDIA_ROOT", "")))
print("MEDIA_URL=" + str(getattr(settings, "MEDIA_URL", "")))
print("DEBUG=" + str(getattr(settings, "DEBUG", "")))
print("ALLOWED_HOSTS=" + str(getattr(settings, "ALLOWED_HOSTS", "")))
print("CORS_ALLOW_ALL_ORIGINS=" + str(getattr(settings, "CORS_ALLOW_ALL_ORIGINS", "")))

User = get_user_model()
print("USER_MODEL=" + User.__name__)
print("USER_TOTAL=" + str(User.objects.count()))
print("USER_ACTIVE=" + str(User.objects.filter(is_active=True).count()))
print("USER_STAFF=" + str(User.objects.filter(is_staff=True).count()))
print("USER_SUPERUSER=" + str(User.objects.filter(is_superuser=True).count()))

for u in User.objects.all().order_by("id")[:50]:
    print("USER_ROW|id={}|username={}|staff={}|superuser={}|active={}".format(
        u.id, getattr(u, "username", ""), u.is_staff, u.is_superuser, u.is_active
    ))

wanted = [
    "Fond", "Catalog", "Warehouse", "StorageLocation", "StorageBox",
    "StorageFile", "Profile", "Document", "DigitalFile", "OcrJob", "AuditLog"
]

for name in wanted:
    model = None
    for m in apps.get_models():
        if m.__name__.lower() == name.lower():
            model = m
            break
    if model is None:
        print("MODEL_COUNT|{}|MODEL_NOT_FOUND".format(name))
    else:
        try:
            print("MODEL_COUNT|{}|{}".format(name, model.objects.count()))
        except Exception as ex:
            print("MODEL_COUNT|{}|ERROR|{}".format(name, ex))

print("ALL_MODELS_BEGIN")
for m in apps.get_models():
    print("MODEL|{}.{}".format(m._meta.app_label, m.__name__))
print("ALL_MODELS_END")
