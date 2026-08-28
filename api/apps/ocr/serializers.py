from rest_framework import serializers
from apps.ocr.models import OcrJob


class OcrJobSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    ocr_mode_display = serializers.CharField(source="get_ocr_mode_display", read_only=True)
    digital_file_name = serializers.CharField(source="digital_file.original_name", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    profile_title = serializers.CharField(source="profile.title", read_only=True)
    document_code = serializers.CharField(source="document.document_code", read_only=True)
    document_title = serializers.CharField(source="document.title", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = OcrJob
        fields = [
            "id",
            "digital_file",
            "digital_file_name",
            "profile",
            "profile_code",
            "profile_title",
            "document",
            "document_code",
            "document_title",
            "created_by",
            "created_by_username",
            "status",
            "status_display",
            "ocr_mode",
            "ocr_mode_display",
            "pipeline_id",
            "lease_owner",
            "lease_expires_at",
            "heartbeat_at",
            "attempt_count",
            "max_attempts",
            "next_retry_at",
            "current_page",
            "progress_percent",
            "engine",
            "language",
            "page_count",
            "character_count",
            "extracted_text",
            "normalized_text",
            "error_message",
            "started_at",
            "finished_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
