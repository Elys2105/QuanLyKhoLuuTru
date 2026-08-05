from rest_framework import serializers

from apps.catalogs.models import Catalog


class CatalogSerializer(serializers.ModelSerializer):
    fond_code = serializers.CharField(source="fond.code", read_only=True)
    fond_name = serializers.CharField(source="fond.name", read_only=True)

    class Meta:
        model = Catalog
        fields = [
            "id",
            "fond",
            "fond_code",
            "fond_name",
            "code",
            "name",
            "year",
            "description",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = [
            "id",
            "fond_code",
            "fond_name",
            "created_at",
            "updated_at",
            "is_deleted",
        ]