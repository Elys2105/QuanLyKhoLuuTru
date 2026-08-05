from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.common.views import BaseModelViewSet
from apps.fonds.models import Fond
from apps.fonds.serializers import FondSerializer


class FondViewSet(BaseModelViewSet):
    queryset = Fond.objects.all()
    serializer_class = FondSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_deleted"]
    search_fields = ["code", "name", "description"]
    ordering_fields = ["id", "code", "name", "created_at", "updated_at"]
    ordering = ["code"]