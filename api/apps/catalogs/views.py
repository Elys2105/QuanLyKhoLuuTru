from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.catalogs.models import Catalog
from apps.catalogs.serializers import CatalogSerializer
from apps.common.views import BaseModelViewSet


class CatalogViewSet(BaseModelViewSet):
    queryset = Catalog.objects.select_related("fond").all()
    serializer_class = CatalogSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["fond", "year", "is_deleted"]
    search_fields = ["code", "name", "description", "fond__code", "fond__name"]
    ordering_fields = ["id", "code", "name", "year", "created_at", "updated_at"]
    ordering = ["fond", "year", "code"]