from rest_framework.routers import DefaultRouter

from apps.catalogs.views import CatalogViewSet


router = DefaultRouter()
router.register("", CatalogViewSet, basename="catalogs")

urlpatterns = router.urls