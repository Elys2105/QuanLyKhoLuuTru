import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
user = User.objects.filter(is_superuser=True).first() or User.objects.first()

client = APIClient()
client.force_authenticate(user=user)

paths = [
    "/api/profiles/",
    "/api/documents/",
    "/api/fonds/",
    "/api/catalogs/",
    "/api/storage-files/warehouses/",
    "/api/storage-files/storage-locations/",
    "/api/storage-files/storage-boxes/",
    "/api/storage-files/storage-files/",
]

print("=== CORE API QUICK CHECK ===")
for path in paths:
    resp = client.get(path, HTTP_HOST="localhost")
    print(path, resp.status_code)

print("DONE CORE API QUICK CHECK")