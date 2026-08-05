from rest_framework import serializers

from apps.storage.models import StorageBox, StorageFile, StorageLocation, Warehouse


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = [
            "id",
            "code",
            "name",
            "address",
            "description",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_deleted"]


class StorageLocationSerializer(serializers.ModelSerializer):
    warehouse_code = serializers.CharField(source="warehouse.code", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = StorageLocation
        fields = [
            "id",
            "warehouse",
            "warehouse_code",
            "warehouse_name",
            "code",
            "name",
            "description",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = [
            "id",
            "warehouse_code",
            "warehouse_name",
            "created_at",
            "updated_at",
            "is_deleted",
        ]


class StorageBoxSerializer(serializers.ModelSerializer):
    location_code = serializers.CharField(source="location.code", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)
    warehouse_name = serializers.CharField(source="location.warehouse.name", read_only=True)

    fond_code = serializers.CharField(source="fond.code", read_only=True)
    fond_name = serializers.CharField(source="fond.name", read_only=True)

    catalog_code = serializers.CharField(source="catalog.code", read_only=True)
    catalog_name = serializers.CharField(source="catalog.name", read_only=True)

    class Meta:
        model = StorageBox
        fields = [
            "id",
            "location",
            "location_code",
            "location_name",
            "warehouse_name",
            "fond",
            "fond_code",
            "fond_name",
            "catalog",
            "catalog_code",
            "catalog_name",
            "box_number",
            "title",
            "description",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = [
            "id",
            "location_code",
            "location_name",
            "warehouse_name",
            "fond_code",
            "fond_name",
            "catalog_code",
            "catalog_name",
            "created_at",
            "updated_at",
            "is_deleted",
        ]


class StorageFileSerializer(serializers.ModelSerializer):
    box_number = serializers.CharField(source="box.box_number", read_only=True)
    box_title = serializers.CharField(source="box.title", read_only=True)
    fond_code = serializers.CharField(source="box.fond.code", read_only=True)
    fond_name = serializers.CharField(source="box.fond.name", read_only=True)

    class Meta:
        model = StorageFile
        fields = [
            "id",
            "box",
            "box_number",
            "box_title",
            "fond_code",
            "fond_name",
            "file_number",
            "title",
            "description",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = [
            "id",
            "box_number",
            "box_title",
            "fond_code",
            "fond_name",
            "created_at",
            "updated_at",
            "is_deleted",
        ]