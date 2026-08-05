from django.core.management.base import BaseCommand
from apps.ocr.models import OcrJob
from apps.ocr.runner import run_worker_and_update_job


class Command(BaseCommand):
    help = "Run OCR fast then quality for one digital file."

    def add_arguments(self, parser):
        parser.add_argument("--fast-job-id", type=int, required=True)
        parser.add_argument("--quality-job-id", type=int, required=True)
        parser.add_argument("--pdf", required=True)

    def handle(self, *args, **options):
        fast_job_id = options["fast_job_id"]
        quality_job_id = options["quality_job_id"]
        pdf_path = options["pdf"]

        run_worker_and_update_job(
            job_id=fast_job_id,
            pdf_path=pdf_path,
            mode="fast",
            dpi=120,
        )

        fast_job = OcrJob.objects.get(id=fast_job_id)

        if fast_job.status == OcrJob.Status.COMPLETED:
            run_worker_and_update_job(
                job_id=quality_job_id,
                pdf_path=pdf_path,
                mode="quality",
                dpi=120,
            )
        else:
            OcrJob.objects.filter(id=quality_job_id).update(
                status=OcrJob.Status.FAILED,
                error_message="Quality OCR không chạy vì fast OCR thất bại.",
            )
