from django.urls import path

from apps.system.views import StorageHealthView

urlpatterns = [
    path("storage/", StorageHealthView.as_view(), name="system-storage-health"),
]
