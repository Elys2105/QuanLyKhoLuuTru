from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit.models import AuditLog
from apps.audit.permissions import CanViewAuditLog
from apps.audit.serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API xem nhật ký hệ thống.

    GET /api/audit-logs/
    GET /api/audit-logs/{id}/

    Query params hỗ trợ:
    - q
    - username
    - action
    - method
    - status_code
    - date_from
    - date_to
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanViewAuditLog]

    def get_queryset(self):
        queryset = AuditLog.objects.select_related("user").all()

        q = self.request.query_params.get("q")
        username = self.request.query_params.get("username")
        action = self.request.query_params.get("action")
        method = self.request.query_params.get("method")
        status_code = self.request.query_params.get("status_code")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if q:
            queryset = queryset.filter(
                Q(username__icontains=q)
                | Q(action__icontains=q)
                | Q(path__icontains=q)
                | Q(object_type__icontains=q)
                | Q(object_id__icontains=q)
                | Q(object_repr__icontains=q)
            )

        if username:
            queryset = queryset.filter(username__icontains=username)

        if action:
            queryset = queryset.filter(action=action)

        if method:
            queryset = queryset.filter(method=method.upper())

        if status_code:
            queryset = queryset.filter(status_code=status_code)

        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset