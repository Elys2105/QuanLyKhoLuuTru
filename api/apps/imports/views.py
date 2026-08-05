import json
import logging

from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.responses import error_response, success_response
from apps.imports.serializers import ProfileImportSerializer
from apps.imports.services import (
    build_profiles_import_template,
    import_profiles_from_excel,
    import_profiles_from_client_rows,
)
from apps.permissions.permissions import ImportPermission

logger = logging.getLogger(__name__)

class ProfileImportTemplateView(APIView):
    """
    Tải file Excel mẫu import hồ sơ.
    """

    permission_classes = [ImportPermission]

    def get(self, request):
        output = build_profiles_import_template()

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = (
            'attachment; filename="profiles_import_template.xlsx"'
        )

        return response


class ProfileImportView(APIView):
    """
    Upload Excel để import hồ sơ hàng loạt.
    """

    permission_classes = [ImportPermission]

    def post(self, request):
        serializer = ProfileImportSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="File import không hợp lệ.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = serializer.validated_data["file"]
        dry_run = serializer.validated_data.get("dry_run", False)
        sheet_name = serializer.validated_data.get("sheet_name") or None
        client_rows_json = serializer.validated_data.get("client_rows_json") or ""

        try:
            if client_rows_json:
                try:
                    client_rows = json.loads(client_rows_json)
                except json.JSONDecodeError:
                    return error_response(
                        message="Danh sách hồ sơ trích xuất không hợp lệ.",
                        errors={"client_rows_json": "Không đọc được JSON."},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                result = import_profiles_from_client_rows(
                    client_rows=client_rows,
                    dry_run=dry_run,
                )
            else:
                result = import_profiles_from_excel(
                    uploaded_file=uploaded_file,
                    dry_run=dry_run,
                    sheet_name=sheet_name if "sheet_name" in locals() else None,
                )
        except Exception as exc:
            logger.exception("Profile Excel import failed")

            return error_response(
                message="Import Excel thất bại. Backend đã ghi log chi tiết.",
                errors={"detail": str(exc)},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if result.get("error_count", 0) > 0:
            return error_response(
                message="File Excel có lỗi dữ liệu.",
                errors=result,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        message = (
            "Kiểm tra file Excel thành công, chưa import vào database."
            if dry_run
            else "Import hồ sơ từ Excel thành công."
        )

        return success_response(
            message=message,
            data=result,
            status_code=status.HTTP_200_OK,
        )