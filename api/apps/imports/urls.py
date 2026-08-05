from django.urls import path

from apps.imports.views import ProfileImportTemplateView, ProfileImportView


app_name = "imports"

urlpatterns = [
    path(
        "profiles/template/",
        ProfileImportTemplateView.as_view(),
        name="profiles-import-template",
    ),
    path(
        "profiles/",
        ProfileImportView.as_view(),
        name="profiles-import",
    ),
]