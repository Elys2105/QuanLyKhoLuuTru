from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(
        source="get_action_display",
        read_only=True,
    )

    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user_id",
            "username",
            "action",
            "action_display",
            "method",
            "path",
            "status_code",
            "object_type",
            "object_id",
            "object_repr",
            "request_data",
            "response_data",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields