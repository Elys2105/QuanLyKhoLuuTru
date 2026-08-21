import os
import traceback
import uuid
from urllib.parse import unquote, urlparse
from urllib.request import (
    HTTPRedirectHandler,
    Request as UrlRequest,
    build_opener,
)

from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.common.views import BaseModelViewSet
from apps.documents.models import Document
from apps.files.models import (
    ALLOWED_DIGITAL_FILE_EXTENSIONS,
    DigitalFile,
    get_digital_file_mime_type,
    get_file_extension,
)
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

    _UPLOAD_TICKET_SALT = "qlklt.digital-file-upload.v1"
    _UPLOAD_TICKET_MAX_AGE = 60 * 60
    _PRIVATE_BLOB_HOST = "po44haoynznxfz6j.private.blob.vercel-storage.com"

    def _validate_direct_upload_metadata(self, data):
        profile_id = data.get("profile") or data.get("profile_id")
        document_id = data.get("document") or data.get("document_id")
        original_name = str(data.get("original_name") or "").strip()
        original_name = original_name.replace("\\", "/").split("/")[-1]
        is_primary = self._bool_value(data.get("is_primary", False))

        try:
            file_size = int(data.get("file_size") or 0)
        except (TypeError, ValueError):
            file_size = 0

        if not profile_id:
            return None, Response(
                {
                    "success": False,
                    "message": "Thiếu hồ sơ đích khi upload file.",
                    "details": {"profile": ["Trường profile là bắt buộc."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not original_name:
            return None, Response(
                {
                    "success": False,
                    "message": "Thiếu tên file gốc.",
                    "details": {"original_name": ["Tên file là bắt buộc."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = get_file_extension(original_name)

        if extension not in ALLOWED_DIGITAL_FILE_EXTENSIONS:
            return None, Response(
                {
                    "success": False,
                    "message": "Loại file không được hỗ trợ.",
                    "details": {
                        "original_name": [
                            "Chỉ hỗ trợ PDF, Word và Excel."
                        ]
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size_mb = int(getattr(settings, "MAX_UPLOAD_SIZE_MB", 100) or 100)
        max_size_bytes = max_size_mb * 1024 * 1024

        if file_size <= 0 or file_size > max_size_bytes:
            return None, Response(
                {
                    "success": False,
                    "message": "Dung lượng file không hợp lệ.",
                    "details": {
                        "file_size": [
                            f"File phải lớn hơn 0 byte và không vượt quá {max_size_mb} MB."
                        ]
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = (
            Profile.objects
            .filter(pk=profile_id, is_deleted=False)
            .first()
        )

        if not profile:
            return None, Response(
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
                return None, Response(
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

        mime_type = get_digital_file_mime_type(
            original_name,
            str(data.get("mime_type") or "").strip() or None,
        )

        return {
            "profile": profile,
            "document": document,
            "original_name": original_name,
            "file_size": file_size,
            "mime_type": mime_type,
            "extension": extension,
            "is_primary": is_primary,
            "max_size_bytes": max_size_bytes,
        }, None

    def _registration_ticket_payload(
        self,
        request,
        validated,
        blob_path,
    ):
        return {
            "version": 1,
            "user_id": str(request.user.pk),
            "profile_id": int(validated["profile"].pk),
            "document_id": (
                int(validated["document"].pk)
                if validated["document"] is not None
                else None
            ),
            "blob_path": blob_path,
            "original_name": validated["original_name"],
            "file_size": int(validated["file_size"]),
            "mime_type": validated["mime_type"],
            "is_primary": bool(validated["is_primary"]),
        }

    def _verify_signed_blob_head_url(
        self,
        signed_head_url,
        blob_path,
        expected_size,
    ):
        value = str(signed_head_url or "").strip()

        if not value or len(value) > 5000:
            raise ValueError("missing_signed_head_url")

        parsed = urlparse(value)

        if (
            parsed.scheme.lower() != "https"
            or (parsed.hostname or "").lower() != self._PRIVATE_BLOB_HOST
            or not parsed.query
        ):
            raise ValueError("invalid_signed_head_origin")

        decoded_path = unquote(parsed.path.lstrip("/"))

        if decoded_path != blob_path:
            raise ValueError("signed_head_path_mismatch")

        request = UrlRequest(
            value,
            method="HEAD",
            headers={
                "User-Agent": "QLKLT-V414-05C",
                "Accept-Encoding": "identity",
            },
        )

        class _NoRedirectHandler(HTTPRedirectHandler):
            def redirect_request(
                self,
                req,
                fp,
                code,
                msg,
                headers,
                newurl,
            ):
                return None

        opener = build_opener(_NoRedirectHandler)

        with opener.open(request, timeout=30) as response:
            response_status = int(
                getattr(response, "status", 0)
                or response.getcode()
                or 0
            )

            if response_status < 200 or response_status >= 300:
                raise ValueError("signed_head_http_status")

            raw_size = str(
                response.headers.get("Content-Length")
                or ""
            ).strip()

            if not raw_size.isdigit():
                raise ValueError("signed_head_missing_size")

            remote_size = int(raw_size)

            if remote_size != int(expected_size):
                raise ValueError("signed_head_size_mismatch")

        return True

    @action(
        detail=False,
        methods=["post"],
        url_path="direct-upload-authorize",
        parser_classes=[JSONParser],
    )
    def direct_upload_authorize(self, request):
        validated, error = self._validate_direct_upload_metadata(request.data)

        if error is not None:
            return error

        blob_path = (
            f"digital-files/uploads/{uuid.uuid4()}"
            f"{validated['extension']}"
        )

        ticket_payload = self._registration_ticket_payload(
            request,
            validated,
            blob_path,
        )

        registration_ticket = signing.dumps(
            ticket_payload,
            salt=self._UPLOAD_TICKET_SALT,
            compress=True,
        )

        return Response(
            {
                "success": True,
                "message": "Đã xác thực quyền upload trực tiếp.",
                "data": {
                    "profile": validated["profile"].id,
                    "document": (
                        validated["document"].id
                        if validated["document"] is not None
                        else None
                    ),
                    "original_name": validated["original_name"],
                    "file_size": validated["file_size"],
                    "mime_type": validated["mime_type"],
                    "extension": validated["extension"],
                    "is_primary": validated["is_primary"],
                    "max_size_bytes": validated["max_size_bytes"],
                    "blob_path": blob_path,
                    "registration_ticket": registration_ticket,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="direct-upload-cleanup-authorize",
        parser_classes=[JSONParser],
    )
    def direct_upload_cleanup_authorize(self, request):
        blob_path = str(
            request.data.get("blob_path")
            or request.data.get("pathname")
            or ""
        ).strip()
        blob_path = blob_path.replace("\\", "/").lstrip("/")

        registration_ticket = str(
            request.data.get("registration_ticket")
            or ""
        ).strip()

        if (
            not blob_path.startswith("digital-files/uploads/")
            or ".." in blob_path.split("/")
            or len(blob_path) > 500
            or not registration_ticket
        ):
            return Response(
                {
                    "success": False,
                    "message": "Cleanup grant không hợp lệ.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ticket_payload = signing.loads(
                registration_ticket,
                salt=self._UPLOAD_TICKET_SALT,
                max_age=self._UPLOAD_TICKET_MAX_AGE,
            )
        except Exception:
            return Response(
                {
                    "success": False,
                    "message": "Cleanup registration ticket không hợp lệ hoặc đã hết hạn.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            str(ticket_payload.get("user_id") or "")
            != str(request.user.pk)
            or str(ticket_payload.get("blob_path") or "")
            != blob_path
        ):
            return Response(
                {
                    "success": False,
                    "message": "Cleanup ticket không khớp user/path.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        if DigitalFile.objects.filter(
            file=blob_path,
            is_deleted=False,
        ).exists():
            return Response(
                {
                    "success": False,
                    "message": "Blob đã được đăng ký vào database; không được phép cleanup.",
                    "data": {
                        "can_delete": False,
                        "database_row_exists": True,
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "success": True,
                "message": "Cleanup được phép.",
                "data": {
                    "can_delete": True,
                    "database_row_exists": False,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="register-blob",
        parser_classes=[JSONParser],
    )
    def register_blob(self, request):
        validated, error = self._validate_direct_upload_metadata(request.data)

        if error is not None:
            return error

        blob_path = str(request.data.get("blob_path") or "").strip()
        blob_path = blob_path.replace("\\", "/").lstrip("/")
        registration_ticket = str(
            request.data.get("registration_ticket")
            or ""
        ).strip()
        signed_head_url = str(
            request.data.get("blob_head_url")
            or ""
        ).strip()
        dry_run = self._bool_value(
            request.data.get("dry_run", False)
        )

        if (
            not blob_path.startswith("digital-files/uploads/")
            or ".." in blob_path.split("/")
            or len(blob_path) > 500
        ):
            return Response(
                {
                    "success": False,
                    "message": "Đường dẫn Blob không hợp lệ.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if get_file_extension(blob_path) != validated["extension"]:
            return Response(
                {
                    "success": False,
                    "message": "Phần mở rộng Blob không khớp file gốc.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not registration_ticket:
            return Response(
                {
                    "success": False,
                    "message": "Thiếu registration ticket.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ticket_payload = signing.loads(
                registration_ticket,
                salt=self._UPLOAD_TICKET_SALT,
                max_age=self._UPLOAD_TICKET_MAX_AGE,
            )
        except Exception:
            return Response(
                {
                    "success": False,
                    "message": "Registration ticket không hợp lệ hoặc đã hết hạn.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected_ticket = self._registration_ticket_payload(
            request,
            validated,
            blob_path,
        )

        if ticket_payload != expected_ticket:
            return Response(
                {
                    "success": False,
                    "message": "Registration ticket không khớp metadata upload.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            self._verify_signed_blob_head_url(
                signed_head_url,
                blob_path,
                validated["file_size"],
            )
        except Exception as exc:
            return Response(
                {
                    "success": False,
                    "message": "Không thể xác thực Private Blob bằng signed HEAD URL.",
                    "details": {
                        "verification_error_type": exc.__class__.__name__,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = (
            DigitalFile.objects
            .filter(
                file=blob_path,
                is_deleted=False,
            )
            .first()
        )

        if existing is not None:
            existing_document_id = (
                int(existing.document_id)
                if existing.document_id is not None
                else None
            )
            expected_document_id = (
                int(validated["document"].pk)
                if validated["document"] is not None
                else None
            )

            if (
                int(existing.profile_id) != int(validated["profile"].pk)
                or existing_document_id != expected_document_id
                or str(existing.original_name or "") != validated["original_name"]
                or int(existing.file_size or 0) != int(validated["file_size"])
                or str(existing.mime_type or "") != validated["mime_type"]
            ):
                return Response(
                    {
                        "success": False,
                        "message": "Blob pathname đã tồn tại nhưng metadata không khớp.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            serializer = self.get_serializer(existing)

            return Response(
                {
                    "success": True,
                    "message": "File Private Blob đã được đăng ký trước đó.",
                    "data": serializer.data,
                    "idempotent": True,
                },
                status=status.HTTP_200_OK,
            )

        if dry_run:
            return Response(
                {
                    "success": True,
                    "message": "Dry-run đăng ký Blob hợp lệ. Database chưa được ghi.",
                    "data": {
                        "validated": True,
                        "database_write": False,
                        "verification": "signed-head-url",
                        "blob_path": blob_path,
                        "file_size": validated["file_size"],
                        "mime_type": validated["mime_type"],
                    },
                },
                status=status.HTTP_200_OK,
            )

        try:
            with transaction.atomic():
                if validated["is_primary"]:
                    DigitalFile.objects.filter(
                        profile=validated["profile"],
                        document=validated["document"],
                        is_deleted=False,
                        is_primary=True,
                    ).update(is_primary=False)

                digital_file = DigitalFile(
                    profile=validated["profile"],
                    document=validated["document"],
                    file=blob_path,
                    original_name=validated["original_name"],
                    file_size=validated["file_size"],
                    mime_type=validated["mime_type"],
                    is_primary=validated["is_primary"],
                )

                if (
                    hasattr(request, "user")
                    and request.user
                    and request.user.is_authenticated
                ):
                    if hasattr(digital_file, "created_by_id"):
                        digital_file.created_by = request.user

                    if hasattr(digital_file, "updated_by_id"):
                        digital_file.updated_by = request.user

                # FileField validators assume a local file. The remote object
                # was authenticated by an exact Django-signed registration
                # ticket plus a short-lived Vercel signed HEAD URL.
                digital_file.save()

                serializer = self.get_serializer(digital_file)

            return Response(
                {
                    "success": True,
                    "message": "Đăng ký file Private Blob thành công.",
                    "data": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception:
            traceback.print_exc()

            return Response(
                {
                    "success": False,
                    "message": "Không thể đăng ký file Private Blob.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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