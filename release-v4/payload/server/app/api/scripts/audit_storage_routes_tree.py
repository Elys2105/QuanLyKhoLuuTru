import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.urls import get_resolver, URLPattern, URLResolver
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


def flatten_patterns(patterns, prefix=""):
    rows = []

    for pattern in patterns:
        raw = str(pattern.pattern)
        path = prefix + raw

        if isinstance(pattern, URLPattern):
            callback = getattr(pattern, "callback", None)
            view_cls = getattr(callback, "cls", None)
            view_name = getattr(view_cls, "__name__", "") if view_cls else getattr(callback, "__name__", "")
            rows.append({
                "path": path,
                "name": pattern.name,
                "view": view_name,
            })

        elif isinstance(pattern, URLResolver):
            rows.extend(flatten_patterns(pattern.url_patterns, path))

    return rows


print("=== BACKEND STORAGE ROUTE AUDIT ===")

all_routes = flatten_patterns(get_resolver().url_patterns)

storage_routes = [
    row for row in all_routes
    if "storage" in row["path"].lower()
    or "warehouse" in row["path"].lower()
    or "box" in row["path"].lower()
    or "location" in row["path"].lower()
]

print("")
print("ROUTES CONTAIN storage/warehouse/box/location:")
for row in storage_routes:
    print(f"- {row['path']} | name={row['name']} | view={row['view']}")

User = get_user_model()
user = User.objects.filter(is_superuser=True).first() or User.objects.first()

if not user:
    print("")
    print("NO USER TO TEST ENDPOINTS")
    raise SystemExit(1)

client = APIClient()
client.force_authenticate(user=user)

candidate_urls = [
    "/api/storage-files/warehouses/",
    "/api/storage-files/storage-locations/",
    "/api/storage-files/storage-boxes/",
    "/api/storage-files/storage-files/",
    "/api/warehouses/",
    "/api/storage-locations/",
    "/api/storage-boxes/",
    "/api/storage-files/",
    "/api/system/storage/",
]

print("")
print("ENDPOINT STATUS:")
for url in candidate_urls:
    try:
        resp = client.get(url, HTTP_HOST="localhost")
        body = ""
        try:
            payload = resp.json()
            if isinstance(payload, dict):
                keys = list(payload.keys())
                count = None

                if isinstance(payload.get("data"), list):
                    count = len(payload["data"])
                elif isinstance(payload.get("results"), list):
                    count = len(payload["results"])
                elif isinstance(payload.get("data"), dict):
                    data = payload["data"]
                    if isinstance(data.get("results"), list):
                        count = len(data["results"])

                body = f" keys={keys} count={count}"
        except Exception:
            body = f" raw={resp.content[:120]!r}"

        print(f"{url} -> {resp.status_code}{body}")

    except Exception as exc:
        print(f"{url} -> ERROR {exc.__class__.__name__}: {exc}")

print("")
print("MODEL COUNTS:")
try:
    from apps.storage.models import Warehouse, StorageLocation, StorageBox, StorageFile

    print("Warehouse:", Warehouse.objects.count())
    print("StorageLocation:", StorageLocation.objects.count())
    print("StorageBox:", StorageBox.objects.count())
    print("StorageFile:", StorageFile.objects.count())

except Exception as exc:
    print("MODEL COUNT ERROR:", exc.__class__.__name__, exc)

print("")
print("DONE BACKEND STORAGE ROUTE AUDIT")