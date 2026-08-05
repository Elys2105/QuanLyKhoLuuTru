import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from apps.ocr.models import OcrJob

print("=== RECENT QUALITY JOBS ===")
for job in OcrJob.objects.filter(ocr_mode="quality").order_by("-id")[:20]:
    print(
        "job=", job.id,
        "file=", job.digital_file_id,
        "status=", job.status,
        "engine=", job.engine,
    )

bad = OcrJob.objects.filter(
    ocr_mode="quality",
    engine__icontains="pymupdf-text-layer",
).count()

print("BAD_QUALITY_TEXT_LAYER_TOTAL:", bad)
print("NOTE: old bad jobs can remain; new quality jobs after restart must be paddle-det+vietocr-rec:vgg_seq2seq.")