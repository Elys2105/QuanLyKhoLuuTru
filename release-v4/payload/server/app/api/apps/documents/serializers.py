from rest_framework import serializers

from apps.documents.models import Document


def get_nested_attr(obj, path):
    value = obj
    for part in path:
        value = getattr(value, part, None)
        if value is None:
            return None
    return value


class DocumentSerializer(serializers.ModelSerializer):
    notes = serializers.CharField(
        source="note",
        required=False,
        allow_blank=True,
    )

    profile_id = serializers.IntegerField(read_only=True)
    profile_code = serializers.SerializerMethodField()
    profile_title = serializers.SerializerMethodField()

    catalog_id = serializers.SerializerMethodField()
    catalog_code = serializers.SerializerMethodField()
    catalog_name = serializers.SerializerMethodField()

    fond_id = serializers.SerializerMethodField()
    fond_code = serializers.SerializerMethodField()
    fond_name = serializers.SerializerMethodField()

    digital_file_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "profile",
            "profile_id",
            "profile_code",
            "profile_title",

            "catalog_id",
            "catalog_code",
            "catalog_name",

            "fond_id",
            "fond_code",
            "fond_name",

            "document_identifier",
            "order_in_profile",

            "document_code",
            "document_number",
            "document_symbol",

            "document_type",
            "title",
            "summary",
            "document_date",

            "author",
            "signer",

            "copy_type",
            "language",
            "security_level",

            "page_start",
            "page_end",
            "page_count",
            "page_number",

            "attachment_note",
            "digital_signature",

            "note",
            "notes",
            "search_text",

            "digital_file_count",
            "created_at",
            "updated_at",
            "is_deleted",
        ]

        read_only_fields = [
            "id",
            "profile_id",
            "profile_code",
            "profile_title",
            "catalog_id",
            "catalog_code",
            "catalog_name",
            "fond_id",
            "fond_code",
            "fond_name",
            "search_text",
            "digital_file_count",
            "created_at",
            "updated_at",
            "is_deleted",
        ]

    def get_profile_code(self, obj):
        return get_nested_attr(obj, ["profile", "profile_code"])

    def get_profile_title(self, obj):
        return get_nested_attr(obj, ["profile", "title"])

    def get_catalog_id(self, obj):
        return get_nested_attr(obj, ["profile", "catalog", "id"])

    def get_catalog_code(self, obj):
        return get_nested_attr(obj, ["profile", "catalog", "code"])

    def get_catalog_name(self, obj):
        return get_nested_attr(obj, ["profile", "catalog", "name"])

    def get_fond_id(self, obj):
        return get_nested_attr(obj, ["profile", "catalog", "fond", "id"])

    def get_fond_code(self, obj):
        return get_nested_attr(obj, ["profile", "catalog", "fond", "code"])

    def get_fond_name(self, obj):
        return get_nested_attr(obj, ["profile", "catalog", "fond", "name"])

    def get_digital_file_count(self, obj):
        manager = getattr(obj, "digital_files", None)

        if manager is not None:
            try:
                return manager.filter(is_deleted=False).count()
            except Exception:
                pass

        fallback_manager = getattr(obj, "digitalfile_set", None)
        if fallback_manager is not None:
            try:
                return fallback_manager.filter(is_deleted=False).count()
            except Exception:
                pass

        return 0