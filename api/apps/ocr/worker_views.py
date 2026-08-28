import hmac
import os
import uuid
from datetime import timedelta

from django.core import signing
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.utils import normalize_search_text
from apps.ocr.models import OcrJob
from apps.ocr.serializers import OcrJobSerializer


LEASE_SECONDS = 180
DOWNLOAD_TICKET_MAX_AGE = 5 * 60
DOWNLOAD_TICKET_SALT = "qlklt.ocr-worker-download.v1"
MAX_CHUNK_CHARACTERS = 150000


def _worker_error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "message": message}, status=code)


def _expected_worker_token():
    return str(os.environ.get("OCR_WORKER_TOKEN") or "").strip()


def _worker_identity(request):
    expected = _expected_worker_token()
    supplied = str(request.headers.get("X-QLKLT-Worker-Token") or "").strip()
    worker_id = str(request.data.get("worker_id") or request.headers.get("X-QLKLT-Worker-Id") or "").strip()

    if not expected or not supplied or not hmac.compare_digest((expected).encode("utf-8"), (supplied).encode("utf-8")):
        return None, _worker_error("Worker authentication failed.", status.HTTP_401_UNAUTHORIZED)

    if not worker_id or len(worker_id) > 128:
        return None, _worker_error("Worker id is required.")

    return worker_id, None


def _lease_token(request):
    raw = str(request.data.get("lease_token") or "").strip()
    try:
        return uuid.UUID(raw)
    except (TypeError, ValueError, AttributeError):
        return None


def _locked_active_job(job_id, worker_id, lease_token):
    now = timezone.now()
    try:
        job = OcrJob.objects.select_for_update().get(pk=job_id)
    except OcrJob.DoesNotExist:
        return None, _worker_error("OCR job not found.", status.HTTP_404_NOT_FOUND)

    if (
        job.status != OcrJob.Status.RUNNING
        or job.lease_owner != worker_id
        or job.lease_token != lease_token
        or not job.lease_expires_at
        or job.lease_expires_at <= now
    ):
        return None, _worker_error("OCR lease is no longer valid.", status.HTTP_409_CONFLICT)

    return job, None


def _quality_is_ready(job):
    if job.ocr_mode != OcrJob.Mode.QUALITY:
        return True

    if not job.pipeline_id:
        return False

    return OcrJob.objects.filter(
        pipeline_id=job.pipeline_id,
        ocr_mode=OcrJob.Mode.FAST,
        status=OcrJob.Status.COMPLETED,
    ).exists()


def _download_ticket(job, worker_id):
    blob_path = str(job.digital_file.file.name or "").replace("\\", "/").lstrip("/")
    if not blob_path:
        raise ValueError("Digital file has no storage pathname.")

    payload = {
        "job_id": int(job.id),
        "lease_token": str(job.lease_token),
        "worker_id": worker_id,
        "blob_path": blob_path,
        "file_size": int(job.digital_file.file_size or 0),
    }
    return signing.dumps(payload, salt=DOWNLOAD_TICKET_SALT, compress=True)


class WorkerHealthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        worker_id, error = _worker_identity(request)
        if error:
            return error
        return Response({"success": True, "worker_id": worker_id, "lease_seconds": LEASE_SECONDS})


class WorkerClaimView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        worker_id, error = _worker_identity(request)
        if error:
            return error

        now = timezone.now()
        lease_until = now + timedelta(seconds=LEASE_SECONDS)

        with transaction.atomic():
            # Recover genuinely abandoned leases under row locks. The retry
            # decision must honor each job's max_attempts rather than a
            # hard-coded number. An expired final attempt becomes terminal
            # FAILED so no OCR job can remain RUNNING forever.
            expired_jobs = list(
                OcrJob.objects
                .select_for_update(skip_locked=True)
                .filter(
                    status=OcrJob.Status.RUNNING,
                    lease_expires_at__isnull=False,
                    lease_expires_at__lte=now,
                )
                .order_by("lease_expires_at", "id")[:100]
            )

            for abandoned in expired_jobs:
                retrying = int(abandoned.attempt_count or 0) < int(
                    abandoned.max_attempts or 0
                )

                abandoned.lease_owner = ""
                abandoned.lease_token = None
                abandoned.lease_expires_at = None
                abandoned.heartbeat_at = None

                if retrying:
                    abandoned.status = OcrJob.Status.PENDING
                    abandoned.next_retry_at = now
                    abandoned.finished_at = None
                    abandoned.error_message = (
                        "Worker lease expired; job returned to the durable queue."
                    )
                else:
                    abandoned.status = OcrJob.Status.FAILED
                    abandoned.next_retry_at = None
                    abandoned.finished_at = now
                    abandoned.error_message = (
                        "Worker lease expired after the maximum number of attempts."
                    )

                abandoned.save(
                    update_fields=[
                        "status",
                        "next_retry_at",
                        "finished_at",
                        "error_message",
                        "lease_owner",
                        "lease_token",
                        "lease_expires_at",
                        "heartbeat_at",
                        "updated_at",
                    ]
                )

                if (
                    not retrying
                    and abandoned.ocr_mode == OcrJob.Mode.FAST
                    and abandoned.pipeline_id
                ):
                    OcrJob.objects.filter(
                        pipeline_id=abandoned.pipeline_id,
                        ocr_mode=OcrJob.Mode.QUALITY,
                        status=OcrJob.Status.PENDING,
                    ).update(
                        status=OcrJob.Status.FAILED,
                        error_message=(
                            "Quality OCR không chạy vì fast OCR mất lease "
                            "sau số lần retry tối đa."
                        ),
                        finished_at=now,
                        updated_at=now,
                    )

            candidates = list(
                OcrJob.objects
                .select_for_update(of=("self",), skip_locked=True)
                .select_related("digital_file", "profile", "document")
                .filter(
                    status=OcrJob.Status.PENDING,
                    pipeline_id__isnull=False,
                )
                .filter(Q(next_retry_at__isnull=True) | Q(next_retry_at__lte=now))
                .order_by("created_at", "id")[:50]
            )

            job = None
            for candidate in candidates:
                if candidate.attempt_count >= candidate.max_attempts:
                    continue
                if not _quality_is_ready(candidate):
                    continue
                job = candidate
                break

            if job is None:
                return Response({"success": True, "data": None, "poll_after_seconds": 5})

            job.status = OcrJob.Status.RUNNING
            job.lease_owner = worker_id
            job.lease_token = uuid.uuid4()
            job.lease_expires_at = lease_until
            job.heartbeat_at = now
            job.next_retry_at = None
            job.attempt_count = int(job.attempt_count or 0) + 1
            job.error_message = ""
            if job.started_at is None:
                job.started_at = now
            job.save(update_fields=[
                "status", "lease_owner", "lease_token", "lease_expires_at",
                "heartbeat_at", "next_retry_at", "attempt_count", "error_message",
                "started_at", "updated_at",
            ])

            ticket = _download_ticket(job, worker_id)
            digital_file = job.digital_file
            data = {
                "job": OcrJobSerializer(job).data,
                "lease_token": str(job.lease_token),
                "lease_expires_at": job.lease_expires_at,
                "download_ticket": ticket,
                "file_size": int(digital_file.file_size or 0),
                "original_name": digital_file.original_name,
                "mime_type": digital_file.mime_type,
                "ocr_mode": job.ocr_mode,
                "dpi": 120,
                "vietocr_model": "vgg_seq2seq" if job.ocr_mode == OcrJob.Mode.QUALITY else "vgg_transformer",
                "force_ocr": bool(job.ocr_mode == OcrJob.Mode.QUALITY),
            }
            return Response({"success": True, "data": data})


class WorkerDownloadTicketValidateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ticket = str(request.data.get("download_ticket") or "").strip()
        if not ticket or len(ticket) > 10000:
            return _worker_error("Download ticket is required.")

        try:
            payload = signing.loads(ticket, salt=DOWNLOAD_TICKET_SALT, max_age=DOWNLOAD_TICKET_MAX_AGE)
            job_id = int(payload["job_id"])
            lease_token = uuid.UUID(str(payload["lease_token"]))
            worker_id = str(payload["worker_id"])
            blob_path = str(payload["blob_path"]).replace("\\", "/").lstrip("/")
            file_size = int(payload.get("file_size") or 0)
        except Exception:
            return _worker_error("Download ticket is invalid or expired.", status.HTTP_401_UNAUTHORIZED)

        try:
            job = OcrJob.objects.select_related("digital_file").get(pk=job_id)
        except OcrJob.DoesNotExist:
            return _worker_error("OCR job not found.", status.HTTP_404_NOT_FOUND)

        current_path = str(job.digital_file.file.name or "").replace("\\", "/").lstrip("/")
        if (
            job.status != OcrJob.Status.RUNNING
            or job.lease_owner != worker_id
            or job.lease_token != lease_token
            or not job.lease_expires_at
            or job.lease_expires_at <= timezone.now()
            or current_path != blob_path
            or int(job.digital_file.file_size or 0) != file_size
            or job.digital_file.is_deleted
        ):
            return _worker_error("Download ticket no longer matches an active lease.", status.HTTP_409_CONFLICT)

        return Response({
            "success": True,
            "data": {
                "pathname": blob_path,
                "file_size": file_size,
                "mime_type": job.digital_file.mime_type or "application/pdf",
                "job_id": job.id,
            },
        })


class WorkerHeartbeatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        worker_id, error = _worker_identity(request)
        if error:
            return error
        lease_token = _lease_token(request)
        if lease_token is None:
            return _worker_error("Lease token is required.")

        with transaction.atomic():
            job, error = _locked_active_job(job_id, worker_id, lease_token)
            if error:
                return error

            current_page = request.data.get("current_page")
            page_count = request.data.get("page_count")
            progress_percent = request.data.get("progress_percent")

            if page_count is not None:
                job.page_count = max(int(page_count), 0)
            if current_page is not None:
                job.current_page = max(int(current_page), 0)
            if progress_percent is not None:
                job.progress_percent = min(max(int(progress_percent), 0), 99)

            now = timezone.now()
            job.heartbeat_at = now
            job.lease_expires_at = now + timedelta(seconds=LEASE_SECONDS)
            job.save(update_fields=[
                "page_count", "current_page", "progress_percent",
                "heartbeat_at", "lease_expires_at", "updated_at",
            ])

        return Response({"success": True, "lease_expires_at": job.lease_expires_at})


class WorkerResultResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        worker_id, error = _worker_identity(request)
        if error:
            return error
        lease_token = _lease_token(request)
        if lease_token is None:
            return _worker_error("Lease token is required.")
        with transaction.atomic():
            job, error = _locked_active_job(job_id, worker_id, lease_token)
            if error:
                return error
            job.extracted_text = ""
            job.normalized_text = ""
            job.character_count = 0
            job.save(update_fields=["extracted_text", "normalized_text", "character_count", "updated_at"])
        return Response({"success": True})


class WorkerResultChunkView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        worker_id, error = _worker_identity(request)
        if error:
            return error
        lease_token = _lease_token(request)
        if lease_token is None:
            return _worker_error("Lease token is required.")
        chunk = str(request.data.get("chunk") or "")
        if not chunk or len(chunk) > MAX_CHUNK_CHARACTERS:
            return _worker_error("OCR result chunk is empty or too large.")
        with transaction.atomic():
            job, error = _locked_active_job(job_id, worker_id, lease_token)
            if error:
                return error
            job.extracted_text = (job.extracted_text or "") + chunk
            job.character_count = len(job.extracted_text)
            job.save(update_fields=["extracted_text", "character_count", "updated_at"])
        return Response({"success": True, "character_count": job.character_count})


class WorkerCompleteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        worker_id, error = _worker_identity(request)
        if error:
            return error
        lease_token = _lease_token(request)
        if lease_token is None:
            return _worker_error("Lease token is required.")

        with transaction.atomic():
            job, error = _locked_active_job(job_id, worker_id, lease_token)
            if error:
                return error

            metadata = request.data.get("metadata")
            if not isinstance(metadata, dict):
                metadata = {}

            worker_text = request.data.get("text")
            if worker_text is None:
                worker_text = metadata.get("text")
            text = str(worker_text if worker_text is not None else (job.extracted_text or ""))

            page_value = request.data.get("page_count")
            if page_value in (None, ""):
                page_value = metadata.get("page_count")
            if page_value in (None, ""):
                page_value = metadata.get("total_pdf_pages")
            page_count = max(int(page_value or 0), 0)

            engine = str(
                request.data.get("engine")
                or metadata.get("engine")
                or f"paddle-{job.ocr_mode}"
            )[:100]
            language = str(
                request.data.get("language")
                or metadata.get("language")
                or "vi"
            )[:50]

            job.status = OcrJob.Status.COMPLETED
            job.engine = engine
            job.language = language
            job.page_count = page_count
            job.current_page = page_count
            job.progress_percent = 100
            job.extracted_text = text
            job.character_count = len(text)
            job.normalized_text = normalize_search_text(text)
            job.error_message = ""
            job.finished_at = timezone.now()
            job.lease_owner = ""
            job.lease_token = None
            job.lease_expires_at = None
            # Keep heartbeat_at as the last observed worker heartbeat for
            # operational evidence after completion. It is no longer a live
            # lease once lease_owner/token/expiry are cleared.
            job.next_retry_at = None
            job.save(update_fields=[
                "status", "engine", "language", "page_count", "current_page",
                "progress_percent", "extracted_text", "character_count", "normalized_text", "error_message",
                "finished_at", "lease_owner", "lease_token", "lease_expires_at",
                "next_retry_at", "updated_at",
            ])

        return Response({"success": True, "data": OcrJobSerializer(job).data})


class WorkerFailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        worker_id, error = _worker_identity(request)
        if error:
            return error
        lease_token = _lease_token(request)
        if lease_token is None:
            return _worker_error("Lease token is required.")
        message = str(request.data.get("error_message") or "OCR worker failed.")[:4000]

        with transaction.atomic():
            job, error = _locked_active_job(job_id, worker_id, lease_token)
            if error:
                return error
            now = timezone.now()
            retrying = int(job.attempt_count or 0) < int(job.max_attempts or 0)
            if retrying:
                job.status = OcrJob.Status.PENDING
                job.next_retry_at = now + timedelta(seconds=min(60, 10 * max(job.attempt_count, 1)))
                job.finished_at = None
            else:
                job.status = OcrJob.Status.FAILED
                job.next_retry_at = None
                job.finished_at = now

            job.error_message = message
            job.lease_owner = ""
            job.lease_token = None
            job.lease_expires_at = None
            job.heartbeat_at = None
            job.save(update_fields=[
                "status", "next_retry_at", "finished_at", "error_message",
                "lease_owner", "lease_token", "lease_expires_at", "heartbeat_at", "updated_at",
            ])

            if not retrying and job.ocr_mode == OcrJob.Mode.FAST and job.pipeline_id:
                OcrJob.objects.filter(
                    pipeline_id=job.pipeline_id,
                    ocr_mode=OcrJob.Mode.QUALITY,
                    status=OcrJob.Status.PENDING,
                ).update(
                    status=OcrJob.Status.FAILED,
                    error_message="Quality OCR không chạy vì fast OCR thất bại sau số lần retry tối đa.",
                    finished_at=now,
                    updated_at=now,
                )

        return Response({"success": True, "retrying": retrying, "data": OcrJobSerializer(job).data})
