from apps.permissions.permissions import AuthenticatedSafeReadArchivePermission
from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.storage.views import (
    StorageBoxViewSet,
    StorageFileViewSet,
    StorageLocationViewSet,
    WarehouseViewSet,
)


router = DefaultRouter()
router.register("warehouses", WarehouseViewSet, basename="warehouses")
router.register("storage-locations", StorageLocationViewSet, basename="storage-locations")
router.register("storage-boxes", StorageBoxViewSet, basename="storage-boxes")
router.register("storage-files", StorageFileViewSet, basename="storage-files")

urlpatterns = router.urls