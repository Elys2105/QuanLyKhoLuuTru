from apps.ocr.worker_views import (
    WorkerClaimView,
    WorkerCompleteView,
    WorkerDownloadTicketValidateView,
    WorkerFailView,
    WorkerHealthView,
    WorkerHeartbeatView,
    WorkerResultChunkView,
    WorkerResultResetView,
)

from django.urls import path

from apps.ocr.views import (
    OcrDigitalFileProgressView,
    OcrDigitalFileTextView,
    OcrDigitalFileDeleteView,
    OcrJobDetailView,
    OcrJobListView,
    OcrJobProgressView,
    OcrRunDigitalFileView,
    OcrRunQualityDigitalFileView,
    OcrSearchView,
    OcrProfileSuggestionView,
    OcrDigitalFilePageImageView,
)

urlpatterns = [
    path("", OcrJobListView.as_view(), name="ocr-list"),
    path("jobs/", OcrJobListView.as_view(), name="ocr-job-list"),
    path("jobs/<int:pk>/", OcrJobDetailView.as_view(), name="ocr-job-detail"),
    path("jobs/<int:pk>/progress/", OcrJobProgressView.as_view(), name="ocr-job-progress"),
    path("digital-files/<int:digital_file_id>/run/", OcrRunDigitalFileView.as_view(), name="ocr-run-digital-file"),
    path("digital-files/<int:digital_file_id>/run-quality/", OcrRunQualityDigitalFileView.as_view(), name="ocr-run-quality-digital-file"),
    path("digital-files/<int:digital_file_id>/progress/", OcrDigitalFileProgressView.as_view(), name="ocr-digital-file-progress"),
    path("digital-files/<int:digital_file_id>/text/", OcrDigitalFileTextView.as_view(), name="ocr-digital-file-text"),
    path("digital-files/<int:digital_file_id>/page-image/<int:page_number>/", OcrDigitalFilePageImageView.as_view(), name="ocr-digital-file-page-image"),
    path("digital-files/<int:digital_file_id>/profile-suggestion/", OcrProfileSuggestionView.as_view(), name="ocr-profile-suggestion"),
    path("digital-files/<int:digital_file_id>/delete/", OcrDigitalFileDeleteView.as_view(), name="ocr-digital-file-delete"),
    path("search/", OcrSearchView.as_view(), name="ocr-search"),
    path("worker/health/", WorkerHealthView.as_view(), name="ocr-worker-health"),
    path("worker/claim/", WorkerClaimView.as_view(), name="ocr-worker-claim"),
    path("worker/download-ticket/validate/", WorkerDownloadTicketValidateView.as_view(), name="ocr-worker-download-ticket-validate"),
    path("worker/jobs/<int:job_id>/heartbeat/", WorkerHeartbeatView.as_view(), name="ocr-worker-heartbeat"),
    path("worker/jobs/<int:job_id>/result-reset/", WorkerResultResetView.as_view(), name="ocr-worker-result-reset"),
    path("worker/jobs/<int:job_id>/result-chunk/", WorkerResultChunkView.as_view(), name="ocr-worker-result-chunk"),
    path("worker/jobs/<int:job_id>/complete/", WorkerCompleteView.as_view(), name="ocr-worker-complete"),
    path("worker/jobs/<int:job_id>/fail/", WorkerFailView.as_view(), name="ocr-worker-fail"),
]
