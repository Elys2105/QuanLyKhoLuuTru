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
]
