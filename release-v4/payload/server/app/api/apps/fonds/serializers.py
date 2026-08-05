from rest_framework import serializers

from apps.fonds.models import Fond


class FondSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fond
        fields = [
            "id",
            "code",
            "name",
            "description",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_deleted"]