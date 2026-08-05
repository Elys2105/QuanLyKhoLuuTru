from apps.permissions.permissions import AuthenticatedSafeReadArchivePermission
from rest_framework.routers import DefaultRouter

from apps.files.views import DigitalFileViewSet


app_name = "files"

router = DefaultRouter()
router.register("", DigitalFileViewSet, basename="digital-file")

urlpatterns = router.urls