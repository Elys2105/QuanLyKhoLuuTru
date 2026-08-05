from rest_framework import serializers


class BaseModelSerializer(serializers.ModelSerializer):
    """
    Serializer base cho các model kế thừa BaseModel.
    """

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    is_deleted = serializers.BooleanField(read_only=True)