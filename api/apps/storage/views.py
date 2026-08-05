from apps.permissions.permissions import AuthenticatedSafeReadArchivePermission
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.common.views import BaseModelViewSet
from apps.storage.models import StorageBox, StorageFile, StorageLocation, Warehouse
from apps.storage.serializers import (
    StorageBoxSerializer,
    StorageFileSerializer,
    StorageLocationSerializer,
    WarehouseSerializer,
)


class WarehouseViewSet(BaseModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_deleted"]
    search_fields = ["code", "name", "address", "description"]
    ordering_fields = ["id", "code", "name", "created_at", "updated_at"]
    ordering = ["code"]


class StorageLocationViewSet(BaseModelViewSet):
    queryset = StorageLocation.objects.select_related("warehouse").all()
    serializer_class = StorageLocationSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["warehouse", "is_deleted"]
    search_fields = ["code", "name", "description", "warehouse__code", "warehouse__name"]
    ordering_fields = ["id", "code", "name", "created_at", "updated_at"]
    ordering = ["warehouse", "code"]


class StorageBoxViewSet(BaseModelViewSet):
    queryset = (
        StorageBox.objects
        .select_related("location", "location__warehouse", "fond", "catalog")
        .all()
    )
    serializer_class = StorageBoxSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["location", "fond", "catalog", "is_deleted"]
    search_fields = [
        "box_number",
        "title",
        "description",
        "fond__code",
        "fond__name",
        "catalog__code",
        "catalog__name",
        "location__code",
        "location__name",
    ]
    ordering_fields = ["id", "box_number", "created_at", "updated_at"]
    ordering = ["fond", "box_number"]


class StorageFileViewSet(BaseModelViewSet):
    permission_classes = [AuthenticatedSafeReadArchivePermission]
    queryset = StorageFile.objects.select_related("box", "box__fond").all()
    serializer_class = StorageFileSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["box", "is_deleted"]
    search_fields = [
        "file_number",
        "title",
        "description",
        "box__box_number",
        "box__fond__code",
        "box__fond__name",
    ]
    ordering_fields = ["id", "file_number", "created_at", "updated_at"]
    ordering = ["box", "file_number"]