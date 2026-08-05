import os
import sys
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import django
django.setup()

from django.apps import apps
from django.db import connection
from django.db.models import Count


def safe_get_model(app_label, model_name):
    try:
        return apps.get_model(app_label, model_name)
    except Exception as exc:
        print(f"{app_label}.{model_name}: ERROR get_model {exc}")
        return None


def safe_attr(obj, name, default="-"):
    try:
        value = getattr(obj, name, default)
        if value is None or value == "":
            return default
        return value
    except Exception:
        return default


def count_model(label, app_label, model_name):
    Model = safe_get_model(app_label, model_name)
    if Model is None:
        return

    try:
        total = Model.objects.count()
        if any(f.name == "is_deleted" for f in Model._meta.fields):
            active = Model.objects.filter(is_deleted=False).count()
            deleted = total - active
            print(f"{label}: total={total} active={active} deleted={deleted}")
        else:
            print(f"{label}: total={total}")
    except Exception as exc:
        print(f"{label}: ERROR count {exc}")


print("=" * 70)
print("DATABASE CONNECTION")
print("=" * 70)
print(f"ENGINE={connection.settings_dict.get('ENGINE')}")
print(f"NAME={connection.settings_dict.get('NAME')}")
print(f"HOST={connection.settings_dict.get('HOST')}")
print(f"PORT={connection.settings_dict.get('PORT')}")
print(f"USER={connection.settings_dict.get('USER')}")

print()
print("=" * 70)
print("DATABASE COUNTS")
print("=" * 70)

MODEL_LIST = [
    ("Users", "auth", "User"),
    ("Groups", "auth", "Group"),
    ("Fonds", "fonds", "Fond"),
    ("Catalogs", "catalogs", "Catalog"),
    ("Warehouses", "storage", "Warehouse"),
    ("StorageLocations", "storage", "StorageLocation"),
    ("StorageBoxes", "storage", "StorageBox"),
    ("StorageFiles", "storage", "StorageFile"),
    ("Profiles", "profiles", "Profile"),
    ("Documents/Records", "documents", "Document"),
    ("DigitalFiles", "files", "DigitalFile"),
    ("OcrJobs", "ocr", "OcrJob"),
    ("AuditLogs", "audit", "AuditLog"),
]

for item in MODEL_LIST:
    count_model(*item)

print()
print("=" * 70)
print("LATEST PROFILES")
print("=" * 70)

Profile = safe_get_model("profiles", "Profile")
if Profile:
    try:
        for p in Profile.objects.all().order_by("-id")[:30]:
            print(
                f"PROFILE={p.id} | code={safe_attr(p, 'profile_code')} | "
                f"title={safe_attr(p, 'title')} | year={safe_attr(p, 'year')} | "
                f"catalog={safe_attr(p, 'catalog_id')} | storage_file={safe_attr(p, 'storage_file_id')} | "
                f"deleted={safe_attr(p, 'is_deleted')}"
            )
    except Exception as exc:
        print(f"LATEST PROFILES ERROR: {exc}")

print()
print("=" * 70)
print("LATEST DOCUMENTS / RECORDS")
print("=" * 70)

Document = safe_get_model("documents", "Document")
if Document:
    try:
        for d in Document.objects.all().order_by("-id")[:50]:
            print(
                f"DOC={d.id} | profile={safe_attr(d, 'profile_id')} | "
                f"code={safe_attr(d, 'document_code')} | title={safe_attr(d, 'title')} | "
                f"date={safe_attr(d, 'document_date')} | author={safe_attr(d, 'author')} | "
                f"deleted={safe_attr(d, 'is_deleted')}"
            )
    except Exception as exc:
        print(f"LATEST DOCUMENTS ERROR: {exc}")

print()
print("=" * 70)
print("LATEST DIGITAL FILES")
print("=" * 70)

DigitalFile = safe_get_model("files", "DigitalFile")
if DigitalFile:
    try:
        for f in DigitalFile.objects.all().order_by("-id")[:50]:
            print(
                f"FILE={f.id} | profile={safe_attr(f, 'profile_id')} | "
                f"doc={safe_attr(f, 'document_id')} | name={safe_attr(f, 'original_name')} | "
                f"type={safe_attr(f, 'file_type')} | mime={safe_attr(f, 'mime_type')} | "
                f"size={safe_attr(f, 'file_size')} | primary={safe_attr(f, 'is_primary')} | "
                f"deleted={safe_attr(f, 'is_deleted')}"
            )
    except Exception as exc:
        print(f"LATEST DIGITAL FILES ERROR: {exc}")

print()
print("=" * 70)
print("LATEST OCR JOBS")
print("=" * 70)

OcrJob = safe_get_model("ocr", "OcrJob")
if OcrJob:
    try:
        for j in OcrJob.objects.all().order_by("-id")[:50]:
            print(
                f"OCR={j.id} | file={safe_attr(j, 'digital_file_id')} | "
                f"profile={safe_attr(j, 'profile_id')} | document={safe_attr(j, 'document_id')} | "
                f"mode={safe_attr(j, 'ocr_mode')} | status={safe_attr(j, 'status')} | "
                f"chars={safe_attr(j, 'character_count')} | pages={safe_attr(j, 'page_count')} | "
                f"engine={safe_attr(j, 'engine')}"
            )
    except Exception as exc:
        print(f"LATEST OCR JOBS ERROR: {exc}")

print()
print("=" * 70)
print("STORAGE DUPLICATE CODE CHECK")
print("=" * 70)

for label, app_label, model_name in [
    ("Warehouse", "storage", "Warehouse"),
    ("StorageLocation", "storage", "StorageLocation"),
    ("StorageBox", "storage", "StorageBox"),
    ("StorageFile", "storage", "StorageFile"),
    ("Profile", "profiles", "Profile"),
    ("Document", "documents", "Document"),
]:
    Model = safe_get_model(app_label, model_name)
    if not Model:
        continue

    code_field = None
    for candidate in ["code", "profile_code", "document_code"]:
        if any(f.name == candidate for f in Model._meta.fields):
            code_field = candidate
            break

    if not code_field:
        print(f"{label}: no code field")
        continue

    try:
        qs = (
            Model.objects.values(code_field)
            .annotate(total=Count("id"))
            .filter(total__gt=1)
            .order_by("-total", code_field)
        )
        if any(f.name == "is_deleted" for f in Model._meta.fields):
            qs = (
                Model.objects.filter(is_deleted=False)
                .values(code_field)
                .annotate(total=Count("id"))
                .filter(total__gt=1)
                .order_by("-total", code_field)
            )

        rows = list(qs[:20])
        if not rows:
            print(f"{label}: OK no duplicate active code")
        else:
            print(f"{label}: DUPLICATES")
            for row in rows:
                print(f"  {code_field}={row.get(code_field)} | total={row.get('total')}")
    except Exception as exc:
        print(f"{label}: duplicate check ERROR {exc}")

print()
print("=" * 70)
print("DONE DB AUDIT")
print("=" * 70)