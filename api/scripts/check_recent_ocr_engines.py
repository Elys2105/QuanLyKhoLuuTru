import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from apps.ocr.models import OcrJob

print("=== RECENT OCR JOB ENGINES ===")
for job in OcrJob.objects.order_by("-id")[:20]:
    print(
        "job=", job.id,
        "file=", getattr(job, "digital_file_id", None),
        "mode=", getattr(job, "ocr_mode", None),
        "status=", getattr(job, "status", None),
        "engine=", getattr(job, "engine", None),
    )

bad_quality = OcrJob.objects.filter(
    ocr_mode="quality",
    engine__icontains="pymupdf-text-layer",
).order_by("-id")[:20]

print()
print("BAD_QUALITY_TEXT_LAYER_COUNT_SAMPLE:", bad_quality.count())
for job in bad_quality:
    print("BAD job=", job.id, "file=", job.digital_file_id, "engine=", job.engine)