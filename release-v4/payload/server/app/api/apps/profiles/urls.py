from rest_framework.routers import DefaultRouter

from apps.profiles.views import ProfileViewSet


router = DefaultRouter()
router.register("", ProfileViewSet, basename="profiles")

urlpatterns = router.urls