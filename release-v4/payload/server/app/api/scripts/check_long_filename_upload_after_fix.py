import os
import sys
import json
import logging
import traceback
from pathlib import Path

BASE_DIR = r"D:\archive-management\api"
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

logging.getLogger("django.request").setLevel(logging.CRITICAL)

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from rest_framework.test import APIClient

from apps.profiles.models import Profile
from apps.documents.models import Document
from apps.files.models import DigitalFile


TEST_NAMES = [
    "BC.29-VPĐU về một số nội dung TTĐU, BTVĐU chỉ đạo xử lý từ ngày 19.12 đến 25.12.2025_0001.pdf",
    "TB.01-VPĐU tham dự HN tập huấn sử dụng Hệ thống thông tin tiếp nhận, xử lý phản ánh, kiến nghị, sáng kiến, giải pháp phát triển KHCN_0001.pdf",
]


def dump(label, value):
    print(label + ":", json.dumps(value, ensure_ascii=False, default=str))


def get_payload(response):
    try:
        return response.json()
    except Exception:
        return {
            "raw": response.content[:2000].decode("utf-8", errors="replace")
        }


created_doc_ids = []
created_file_ids = []

try:
    User = get_user_model()

    user = (
        User.objects.filter(username__iexact="Admin").first()
        or User.objects.filter(username__iexact="admin").first()
        or User.objects.filter(is_superuser=True).first()
    )

    if not user:
        raise RuntimeError("Khong co user admin de test.")

    profile = Profile.objects.filter(is_deleted=False).order_by("-id").first()

    if not profile:
        raise RuntimeError("Khong co ho so de test.")

    source_pdf = None

    for path in Path(settings.MEDIA_ROOT).rglob("*.pdf"):
        if path.is_file() and path.stat().st_size > 0:
            source_pdf = path
            break

    if not source_pdf:
        raise RuntimeError("Khong co PDF mau trong media de test.")

    print("SOURCE_PDF:", source_pdf)
    print("PROFILE:", profile.id)

    client = APIClient()
    client.force_authenticate(user=user)

    for index, long_name in enumerate(TEST_NAMES, start=1):
        print()
        print("=== TEST LONG NAME", index, "===")
        print("LONG_NAME_LENGTH:", len(long_name))
        print("LONG_NAME:", long_name)

        doc_payload = {
            "profile": profile.id,
            "document_code": f"__TEST_LONG_FILENAME_{index}__",
            "title": f"__TEST_LONG_FILENAME_{index}__",
            "summary": "Test upload filename dài, sẽ xóa.",
            "document_type": "PDF test",
        }

        response = client.post("/api/documents/", doc_payload, format="json", HTTP_HOST="localhost")
        payload = get_payload(response)

        print("CREATE_DOC_STATUS:", response.status_code)

        if response.status_code not in {200, 201}:
            dump("CREATE_DOC_RESPONSE", payload)
            raise RuntimeError("Tao document test that bai.")

        doc_id = payload.get("data", payload).get("id")
        created_doc_ids.append(doc_id)

        with open(source_pdf, "rb") as f:
            upload = SimpleUploadedFile(
                name=long_name,
                content=f.read(),
                content_type="application/pdf",
            )

        response = client.post(
            "/api/digital-files/",
            {
                "profile": str(profile.id),
                "document": str(doc_id),
                "is_primary": "true",
                "file": upload,
            },
            format="multipart",
            HTTP_HOST="localhost",
        )

        payload = get_payload(response)

        print("UPLOAD_STATUS:", response.status_code)
        dump("UPLOAD_RESPONSE", payload)

        if response.status_code not in {200, 201}:
            raise RuntimeError("Upload long filename that bai.")

        file_data = payload.get("data", payload)
        file_id = file_data.get("id")
        created_file_ids.append(file_id)

        df = DigitalFile.objects.get(id=file_id)

        print("SAVED_ORIGINAL_NAME:", df.original_name)
        print("SAVED_FILE_NAME:", df.file.name)
        print("SAVED_FILE_NAME_LENGTH:", len(df.file.name))
        print("SAVED_FILE_EXISTS:", os.path.exists(df.file.path))

        if long_name != df.original_name:
            raise RuntimeError("original_name khong giu dung ten file goc.")

        if len(df.file.name) >= 500:
            raise RuntimeError("file.name van qua dai.")

        response = client.get(f"/api/digital-files/{file_id}/preview/", HTTP_HOST="localhost")
        print("PREVIEW_STATUS:", response.status_code, response.get("Content-Type"))

        if response.status_code != 200:
            raise RuntimeError("Preview file sau upload that bai.")

    print()
    print("RESULT: PASS")
    print("KET_LUAN: Upload file ten dai vao ban ghi OK, preview OK, original_name van giu day du.")

except Exception as exc:
    print()
    print("RESULT: FAIL")
    print("ERROR:", str(exc))
    traceback.print_exc()
    raise SystemExit(2)

finally:
    print()
    print("=== CLEANUP TEST DATA ===")

    for file_id in created_file_ids:
        try:
            df = DigitalFile.objects.filter(id=file_id).first()

            if df:
                path = df.file.path if df.file else None

                try:
                    if df.file:
                        df.file.delete(save=False)
                except Exception as exc:
                    print("WARN delete file:", file_id, exc)

                df.delete()

                print("CLEAN_FILE:", file_id, path, "exists_after=", os.path.exists(path) if path else None)
        except Exception as exc:
            print("WARN cleanup file:", file_id, exc)

    for doc_id in created_doc_ids:
        try:
            Document.objects.filter(id=doc_id).delete()
            print("CLEAN_DOC:", doc_id)
        except Exception as exc:
            print("WARN cleanup doc:", doc_id, exc)