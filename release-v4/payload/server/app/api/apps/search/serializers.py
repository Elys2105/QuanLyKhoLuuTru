from rest_framework import serializers


class SearchDocumentResultSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    document_code = serializers.CharField(allow_blank=True)
    title = serializers.CharField()
    document_date = serializers.DateField(allow_null=True)
    author = serializers.CharField(allow_blank=True)
    page_start = serializers.IntegerField(allow_null=True)
    page_end = serializers.IntegerField(allow_null=True)
    summary = serializers.CharField(allow_blank=True)


class SearchDigitalFileResultSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    document_id = serializers.IntegerField(allow_null=True)
    original_name = serializers.CharField(allow_blank=True)
    file_url = serializers.CharField(allow_null=True)
    file_size = serializers.IntegerField(allow_null=True)
    mime_type = serializers.CharField(allow_blank=True)
    page_count = serializers.IntegerField(allow_null=True)
    is_primary = serializers.BooleanField()


class ProfileSearchResultSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    profile_code = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    year = serializers.IntegerField(allow_null=True)
    total_pages = serializers.IntegerField(allow_null=True)
    retention_period = serializers.CharField(allow_blank=True)
    language = serializers.CharField(allow_blank=True)
    note = serializers.CharField(allow_blank=True)

    fond_id = serializers.IntegerField(allow_null=True)
    fond_code = serializers.CharField(allow_null=True)
    fond_name = serializers.CharField(allow_null=True)

    catalog_id = serializers.IntegerField(allow_null=True)
    catalog_code = serializers.CharField(allow_null=True)
    catalog_name = serializers.CharField(allow_null=True)

    warehouse_id = serializers.IntegerField(allow_null=True)
    warehouse_code = serializers.CharField(allow_null=True)
    warehouse_name = serializers.CharField(allow_null=True)

    location_id = serializers.IntegerField(allow_null=True)
    location_code = serializers.CharField(allow_null=True)
    location_name = serializers.CharField(allow_null=True)

    box_id = serializers.IntegerField(allow_null=True)
    box_number = serializers.CharField(allow_null=True)
    box_title = serializers.CharField(allow_null=True)

    storage_file_id = serializers.IntegerField(allow_null=True)
    storage_file_number = serializers.CharField(allow_null=True)
    storage_file_title = serializers.CharField(allow_null=True)

    pdf_preview_url = serializers.CharField(allow_null=True)
    pdf_download_url = serializers.CharField(allow_null=True, required=False)
    digital_files = SearchDigitalFileResultSerializer(many=True)
    matched_documents = SearchDocumentResultSerializer(many=True)

    match_type = serializers.ListField(
        child=serializers.CharField(),
    )
