from rest_framework import serializers

from apps.profiles.models import Profile


def get_nested_attr(obj, path):
    value = obj
    for part in path:
        value = getattr(value, part, None)
        if value is None:
            return None
    return value


class ProfileSerializer(serializers.ModelSerializer):
    notes = serializers.CharField(
        source="note",
        required=False,
        allow_blank=True,
    )

    catalog_id = serializers.IntegerField(read_only=True)
    catalog_code = serializers.SerializerMethodField()
    catalog_name = serializers.SerializerMethodField()

    fond_id = serializers.SerializerMethodField()
    fond_code = serializers.SerializerMethodField()
    fond_name = serializers.SerializerMethodField()

    storage_file_id = serializers.IntegerField(read_only=True)
    storage_file_number = serializers.SerializerMethodField()
    storage_file_title = serializers.SerializerMethodField()

    box_id = serializers.SerializerMethodField()
    box_number = serializers.SerializerMethodField()
    box_title = serializers.SerializerMethodField()

    location_id = serializers.SerializerMethodField()
    location_code = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()

    warehouse_id = serializers.SerializerMethodField()
    warehouse_code = serializers.SerializerMethodField()
    warehouse_name = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",

            "catalog",
            "catalog_id",
            "catalog_code",
            "catalog_name",

            "fond_id",
            "fond_code",
            "fond_name",

            "storage_file",
            "storage_file_id",
            "storage_file_number",
            "storage_file_title",

            "box_id",
            "box_number",
            "box_title",

            "location_id",
            "location_code",
            "location_name",

            "warehouse_id",
            "warehouse_code",
            "warehouse_name",

            "profile_type",
            "profile_code",
            "file_notation",
            "title",
            "description",

            "preservation_unit_number",
            "historical_archive_code",

            "start_date",
            "end_date",
            "year",

            "total_documents",
            "total_pages",

            "profile_group_name",
            "retention_period",
            "physical_condition",
            "keywords",
            "topic",
            "storage_position_text",

            "language",
            "note",
            "notes",

            "search_text",
            "created_at",
            "updated_at",
            "is_deleted",
        ]

        read_only_fields = [
            "id",
            "catalog_id",
            "catalog_code",
            "catalog_name",
            "fond_id",
            "fond_code",
            "fond_name",
            "storage_file_id",
            "storage_file_number",
            "storage_file_title",
            "box_id",
            "box_number",
            "box_title",
            "location_id",
            "location_code",
            "location_name",
            "warehouse_id",
            "warehouse_code",
            "warehouse_name",
            "search_text",
            "created_at",
            "updated_at",
            "is_deleted",
        ]

    def get_catalog_code(self, obj):
        return get_nested_attr(obj, ["catalog", "code"])

    def get_catalog_name(self, obj):
        return get_nested_attr(obj, ["catalog", "name"])

    def get_fond_id(self, obj):
        return get_nested_attr(obj, ["catalog", "fond", "id"])

    def get_fond_code(self, obj):
        return get_nested_attr(obj, ["catalog", "fond", "code"])

    def get_fond_name(self, obj):
        return get_nested_attr(obj, ["catalog", "fond", "name"])

    def get_storage_file_number(self, obj):
        return get_nested_attr(obj, ["storage_file", "file_number"])

    def get_storage_file_title(self, obj):
        return get_nested_attr(obj, ["storage_file", "title"])

    def get_box_id(self, obj):
        return get_nested_attr(obj, ["storage_file", "box", "id"])

    def get_box_number(self, obj):
        return get_nested_attr(obj, ["storage_file", "box", "box_number"])

    def get_box_title(self, obj):
        return get_nested_attr(obj, ["storage_file", "box", "title"])

    def get_location_id(self, obj):
        return get_nested_attr(obj, ["storage_file", "box", "location", "id"])

    def get_location_code(self, obj):
        return get_nested_attr(obj, ["storage_file", "box", "location", "code"])

    def get_location_name(self, obj):
        return get_nested_attr(obj, ["storage_file", "box", "location", "name"])

    def get_warehouse_id(self, obj):
        return get_nested_attr(
            obj,
            ["storage_file", "box", "location", "warehouse", "id"],
        )

    def get_warehouse_code(self, obj):
        return get_nested_attr(
            obj,
            ["storage_file", "box", "location", "warehouse", "code"],
        )

    def get_warehouse_name(self, obj):
        return get_nested_attr(
            obj,
            ["storage_file", "box", "location", "warehouse", "name"],
        )