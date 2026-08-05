from django.urls import path

from apps.exports.views import ProfileExcelExportView, ProfilePdfExportView


app_name = "exports"

urlpatterns = [
    path(
        "profiles/excel/",
        ProfileExcelExportView.as_view(),
        name="profiles-export-excel",
    ),
    path(
        "profiles/pdf/",
        ProfilePdfExportView.as_view(),
        name="profiles-export-pdf",
    ),
]