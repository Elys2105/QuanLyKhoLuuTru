import os
import traceback

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.common.views import BaseModelViewSet
from apps.documents.models import Document
from apps.files.models import DigitalFile
from apps.files.serializers import DigitalFileSerializer
from apps.permissions.permissions import DigitalFilePermission, AuthenticatedSafeReadArchivePermission
from apps.profiles.models import Profile


class DigitalFileViewSet(BaseModelViewSet):
    """
    API quản lý file số hóa.

    Endpoint chính:
    - GET    /api/digital-files/
    - POST   /api/digital-files/
    - GET    /api/digital-files/{id}/
    - PUT    /api/digital-files/{id}/
    - PATCH  /api/digital-files/{id}/
    - DELETE /api/digital-files/{id}/

    Endpoint file:
    - GET /api/digital-files/{id}/preview/
    - GET /api/digital-files/{id}/download/
    """

    queryset = (
        DigitalFile.objects
        .select_related("profile", "document")
        .all()
    )
    serializer_class = DigitalFileSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "profile",
        "document",
        "is_primary",
        "is_deleted",
        "mime_type",
    ]
    search_fields = [
        "original_name",
        "profile__profile_code",
        "profile__title",
        "document__document_code",
        "document__title",
    ]
    ordering_fields = [
        "id",
        "original_name",
        "file_size",
        "mime_type",
        "page_count",
        "is_primary",
        "created_at",
        "updated_at",
    ]
    ordering = ["profile", "-is_primary", "id"]

    def _bool_value(self, value):
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    def create(self, request, *args, **kwargs):
        """
        Upload file số hóa vào hồ sơ hoặc bản ghi.

        Fix dứt điểm:
        - Không để multipart/file làm audit log gây 500.
        - Trả lỗi rõ ràng nếu thiếu profile/document.
        - Nếu có document thì bắt buộc document thuộc profile.
        - File chính chỉ duy nhất trong cùng scope profile+document.
        """
        uploaded_file = request.FILES.get("file")
        profile_id = request.data.get("profile") or request.data.get("profile_id")
        document_id = request.data.get("document") or request.data.get("document_id")
        is_primary = self._bool_value(request.data.get("is_primary", False))

        if not uploaded_file:
            return Response(
                {
                    "success": False,
                    "message": "Chưa chọn file upload.",
                    "details": {"file": ["Trường file là bắt buộc."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not profile_id:
            return Response(
                {
                    "success": False,
                    "message": "Thiếu hồ sơ đích khi upload file.",
                    "details": {"profile": ["Trường profile là bắt buộc."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = (
            Profile.objects
            .filter(pk=profile_id, is_deleted=False)
            .first()
        )

        if not profile:
            return Response(
                {
                    "success": False,
                    "message": "Không tìm thấy hồ sơ đích hoặc hồ sơ đã bị xóa.",
                    "details": {"profile": [f"profile={profile_id} không tồn tại."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        document = None

        if document_id not in (None, "", "null", "undefined", "none"):
            document = (
                Document.objects
                .filter(pk=document_id, profile=profile, is_deleted=False)
                .first()
            )

            if not document:
                return Response(
                    {
                        "success": False,
                        "message": "Không tìm thấy bản ghi trong hồ sơ đang chọn.",
                        "details": {
                            "document": [
                                f"document={document_id} không tồn tại hoặc không thuộc profile={profile_id}."
                            ]
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            if is_primary:
                DigitalFile.objects.filter(
                    profile=profile,
                    document=document,
                    is_deleted=False,
                    is_primary=True,
                ).update(is_primary=False)

            digital_file = DigitalFile(
                profile=profile,
                document=document,
                file=uploaded_file,
                original_name=getattr(uploaded_file, "name", "") or "",
                is_primary=is_primary,
            )

            if hasattr(request, "user") and request.user and request.user.is_authenticated:
                if hasattr(digital_file, "created_by_id"):
                    digital_file.created_by = request.user
                if hasattr(digital_file, "updated_by_id"):
                    digital_file.updated_by = request.user

            digital_file.full_clean()
            digital_file.save()

            serializer = self.get_serializer(digital_file)

            return Response(
                {
                    "success": True,
                    "message": "Upload file vào bản ghi thành công.",
                    "data": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except DjangoValidationError as exc:
            return Response(
                {
                    "success": False,
                    "message": "File upload không hợp lệ.",
                    "details": getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:
            print("=== DIGITAL FILE UPLOAD ERROR ===")
            traceback.print_exc()

            return Response(
                {
                    "success": False,
                    "message": "Upload file vào bản ghi thất bại.",
                    "details": {
                        "type": exc.__class__.__name__,
                        "error": str(exc),
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_file_for_response(self, pk):
        digital_file = get_object_or_404(
            DigitalFile.objects.select_related("profile", "document"),
            pk=pk,
            is_deleted=False,
        )

        if not digital_file.file:
            return digital_file, Response(
                {
                    "success": False,
                    "message": "File chưa có dữ liệu vật lý.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            file_path = digital_file.file.path
        except Exception:
            file_path = ""

        if not file_path or not os.path.exists(file_path):
            return digital_file, Response(
                {
                    "success": False,
                    "message": "Không tìm thấy file vật lý trên máy chủ.",
                    "details": {"file": digital_file.file.name},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return digital_file, None

    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        digital_file, error = self._get_file_for_response(pk)

        if error is not None:
            return error

        if not digital_file.is_pdf:
            return Response(
                {
                    "success": False,
                    "message": "Chỉ PDF được xem trước trực tiếp. Word/Excel hãy tải về để mở.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return FileResponse(
            open(digital_file.file.path, "rb"),
            content_type=digital_file.mime_type or "application/pdf",
            as_attachment=False,
            filename=digital_file.original_name or os.path.basename(digital_file.file.name),
        )

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        digital_file, error = self._get_file_for_response(pk)

        if error is not None:
            return error

        return FileResponse(
            open(digital_file.file.path, "rb"),
            content_type=digital_file.mime_type or "application/octet-stream",
            as_attachment=True,
            filename=digital_file.original_name or os.path.basename(digital_file.file.name),
        )