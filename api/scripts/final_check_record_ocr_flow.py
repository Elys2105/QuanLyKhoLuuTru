import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.documents.models import Document
from apps.files.models import DigitalFile
from apps.ocr.models import OcrJob


def ok(label, value="OK"):
    print(f"[OK] {label}: {value}")


def fail(label, value):
    print(f"[FAIL] {label}: {value}")
    raise SystemExit(1)


def warn(label, value):
    print(f"[WARN] {label}: {value}")


User = get_user_model()
user = User.objects.filter(is_superuser=True).first() or User.objects.first()

if not user:
    fail("user", "Không có user để test API")

client = APIClient()
client.force_authenticate(user=user)

print("=== BACKEND RECORD OCR FLOW CHECK ===")

# Ưu tiên file #10 nếu còn tồn tại vì đây là case đã test đúng.
digital_file = DigitalFile.objects.filter(id=10, is_deleted=False).first()

if not digital_file:
    digital_file = (
        DigitalFile.objects
        .filter(document__isnull=False, is_deleted=False)
        .order_by("-id")
        .first()
    )

if not digital_file:
    fail("digital_file", "Không có file nào gắn vào bản ghi")

ok("digital_file", f"id={digital_file.id}, name={digital_file.original_name}")

if not digital_file.document_id:
    fail("digital_file.document_id", "File chưa gắn vào bản ghi")

ok("digital_file.document_id", digital_file.document_id)
ok("digital_file.profile_id", digital_file.profile_id)

document = Document.objects.filter(id=digital_file.document_id).first()

if not document:
    fail("document", f"Không tìm thấy document #{digital_file.document_id}")

ok("document", f"id={document.id}, code={document.document_code}, title={document.title}")

ocr_jobs = OcrJob.objects.filter(digital_file=digital_file).order_by("-id")
print("OCR JOB COUNT:", ocr_jobs.count())

if not ocr_jobs.exists():
    fail("ocr_jobs", "File chưa có OCR job")

completed_jobs = [
    job for job in ocr_jobs
    if str(job.status).upper() == "COMPLETED"
]

if not completed_jobs:
    warn("ocr_completed", "Chưa có job COMPLETED, vẫn thử endpoint gợi ý nếu backend chọn được job tốt nhất")
else:
    ok("ocr_completed_jobs", len(completed_jobs))

resp = client.get(
    f"/api/ocr/digital-files/{digital_file.id}/profile-suggestion/",
    HTTP_HOST="localhost",
)

print("SUGGESTION STATUS:", resp.status_code)

if resp.status_code != 200:
    print(resp.content[:1000])
    fail("profile-suggestion endpoint", f"status={resp.status_code}")

payload = resp.json()
data = payload.get("data", payload)
suggestion = data.get("suggestion", {})

required_keys = [
    "document_code",
    "document_number",
    "document_symbol",
    "document_type",
    "document_date",
    "author",
    "signer",
    "summary",
    "page_count",
    "security_level",
]

print("SUGGESTION:")
for key in required_keys:
    print(f"  {key}: {suggestion.get(key)}")

expected_pairs = {
    "security_level": "Thường",
}

if digital_file.id == 10:
    expected_pairs.update({
        "document_code": "281-CV/VPĐU",
        "document_type": "Công văn",
        "author": "VĂN PHÒNG ĐẢNG ỦY PHƯỜNG BÌNH TIÊN",
        "signer": "Huỳnh Thị Mỹ Linh",
        "summary": "Về rà soát quá trình tham gia BHXH, BHYT, BHTT của Văn phòng Đảng ủy phường Bình Tiên",
    })

for key, expected in expected_pairs.items():
    actual = suggestion.get(key)
    if actual != expected:
        fail(f"suggestion.{key}", f"expected={expected!r}, actual={actual!r}")
    ok(f"suggestion.{key}", actual)

confidence = data.get("confidence")
warnings = data.get("warnings", [])
preview_text = data.get("preview_text", "")

print("CONFIDENCE:", confidence)
print("WARNINGS:", warnings)
print("PREVIEW_TEXT_CHARS:", len(preview_text or ""))

if confidence is not None and int(confidence) < 70:
    fail("confidence", f"Quá thấp: {confidence}")

# Test PATCH thật vào bản ghi bằng field bản ghi, không đổ placeholder OCR vào ghi chú.
patch_payload = {
    "document_identifier": suggestion.get("document_identifier") or suggestion.get("document_code") or document.document_identifier,
    "document_code": suggestion.get("document_code") or suggestion.get("profile_code") or document.document_code,
    "document_number": suggestion.get("document_number") or document.document_number,
    "document_symbol": suggestion.get("document_symbol") or document.document_symbol,
    "document_type": suggestion.get("document_type") or document.document_type,
    "title": suggestion.get("title") or suggestion.get("summary") or document.title,
    "summary": suggestion.get("summary") or document.summary,
    "document_date": suggestion.get("document_date") or document.document_date,
    "author": suggestion.get("author") or document.author,
    "signer": suggestion.get("signer") or document.signer,
    "page_count": suggestion.get("page_count") or suggestion.get("total_pages") or document.page_count,
    "language": "Tiếng Việt",
    "security_level": "Thường",
    "notes": document.note or "",
}

resp = client.patch(
    f"/api/documents/{document.id}/",
    patch_payload,
    format="json",
    HTTP_HOST="localhost",
)

print("DOCUMENT PATCH STATUS:", resp.status_code)

if resp.status_code not in (200, 202):
    print(resp.content[:1000])
    fail("document patch", f"status={resp.status_code}")

document.refresh_from_db()

verify_fields = [
    "document_code",
    "document_number",
    "document_symbol",
    "document_type",
    "document_date",
    "author",
    "signer",
    "summary",
    "page_count",
    "language",
    "security_level",
]

print("DOCUMENT AFTER PATCH:")
for key in verify_fields:
    print(f"  {key}: {getattr(document, key, None)}")

if digital_file.id == 10:
    if document.signer != "Huỳnh Thị Mỹ Linh":
        fail("document.signer", document.signer)

    if document.author != "VĂN PHÒNG ĐẢNG ỦY PHƯỜNG BÌNH TIÊN":
        fail("document.author", document.author)

    if document.security_level != "Thường":
        fail("document.security_level", document.security_level)

    if "Tạo gợi ý từ OCR job" in (document.note or ""):
        fail("document.note", "Còn placeholder OCR trong ghi chú")

ok("document patched", f"id={document.id}")

linked_files = DigitalFile.objects.filter(document__isnull=False, is_deleted=False).count()
loose_files = DigitalFile.objects.filter(document__isnull=True, is_deleted=False).count()

print("LINKED_FILES_DOCUMENT_NOT_NULL:", linked_files)
print("LOOSE_FILES_DOCUMENT_NULL:", loose_files)

print("DONE BACKEND RECORD OCR FLOW CHECK")