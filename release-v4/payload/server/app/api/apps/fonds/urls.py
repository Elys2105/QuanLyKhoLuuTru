from rest_framework.routers import DefaultRouter

from apps.fonds.views import FondViewSet


router = DefaultRouter()
router.register("", FondViewSet, basename="fonds")

urlpatterns = router.urls