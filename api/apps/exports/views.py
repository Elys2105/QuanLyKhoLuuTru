from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.exports.services import (
    build_profiles_excel_export,
    build_profiles_pdf_export,
)
from apps.permissions.permissions import ExportPermission

class ProfileExcelExportView(APIView):
    """
    Export danh sách hồ sơ ra Excel.

    Ví dụ:
    /api/exports/profiles/excel/?q=bao%20cao
    /api/exports/profiles/excel/?year=2025
    /api/exports/profiles/excel/?box_number=25
    """

    permission_classes = [ExportPermission]

    def get(self, request):
        output, total = build_profiles_excel_export(request.query_params)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = (
            'attachment; filename="profiles_export.xlsx"'
        )
        response["X-Total-Count"] = str(total)

        return response


class ProfilePdfExportView(APIView):
    """
    Export danh sách hồ sơ ra PDF.

    Ví dụ:
    /api/exports/profiles/pdf/?q=bao%20cao
    /api/exports/profiles/pdf/?year=2025
    /api/exports/profiles/pdf/?box_number=25
    """

    permission_classes = [ExportPermission]

    def get(self, request):
        output, total = build_profiles_pdf_export(request.query_params)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/pdf",
        )
        response["Content-Disposition"] = (
            'attachment; filename="profiles_export.pdf"'
        )
        response["X-Total-Count"] = str(total)
        response["X-Content-Type-Options"] = "nosniff"

        return response