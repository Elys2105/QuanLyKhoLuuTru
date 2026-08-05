from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.pagination import CustomPageNumberPagination
from apps.common.responses import success_response
from apps.search.serializers import ProfileSearchResultSerializer
from apps.search.services import build_profile_search_queryset
from apps.permissions.permissions import SearchPermission

class ProfileSearchView(APIView):
    """
    API tìm kiếm hồ sơ nâng cao.

    GET /api/search/profiles/

    Query params:
    - q
    - profile_code
    - title
    - document_code
    - document_title
    - fond
    - catalog
    - warehouse
    - location
    - box
    - box_number
    - storage_file
    - file_number
    - year
    - retention_period
    - has_pdf
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSearchResultSerializer

    def get(self, request):
        queryset = build_profile_search_queryset(request.query_params)
        queryset = queryset.order_by("catalog__fond__code", "year", "profile_code")

        paginator = CustomPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)

        results = [
            self.build_profile_result(profile, request)
            for profile in page
        ]

        serializer = ProfileSearchResultSerializer(results, many=True)

        paginated_data = {
            "results": serializer.data,
            "pagination": {
                "page": paginator.page.number,
                "page_size": paginator.get_page_size(request),
                "total": paginator.page.paginator.count,
                "total_pages": paginator.page.paginator.num_pages,
                "has_next": paginator.page.has_next(),
                "has_previous": paginator.page.has_previous(),
            },
        }

        return success_response(
            data=paginated_data,
            message="Tìm kiếm hồ sơ thành công",
        )

    def build_profile_result(self, profile, request):
        catalog = profile.catalog
        fond = catalog.fond if catalog else None

        storage_file = profile.storage_file
        box = storage_file.box if storage_file else None
        location = box.location if box else None
        warehouse = location.warehouse if location else None

        digital_files = []
        pdf_preview_url = None
        pdf_download_url = None

        for digital_file in profile.digital_files.all():
            if digital_file.is_deleted:
                continue

            file_url = None
            preview_url = None
            download_url = None

            if digital_file.file:
                preview_path = f"/api/digital-files/{digital_file.id}/preview/"
                download_path = f"/api/digital-files/{digital_file.id}/download/"
                preview_url = request.build_absolute_uri(preview_path)
                download_url = request.build_absolute_uri(download_path)
                file_url = preview_url

            if digital_file.is_primary and file_url:
                pdf_preview_url = file_url
                pdf_download_url = download_url

            if not pdf_preview_url and file_url:
                pdf_preview_url = file_url
                pdf_download_url = download_url

            digital_files.append(
                {
                    "id": digital_file.id,
                    "document_id": digital_file.document_id,
                    "original_name": digital_file.original_name,
                    "file_url": file_url,
                    "preview_url": preview_url,
                    "download_url": download_url,
                    "file_size": digital_file.file_size,
                    "mime_type": digital_file.mime_type,
                    "page_count": digital_file.page_count,
                    "is_primary": digital_file.is_primary,
                }
            )

        matched_documents = []

        for document in profile.documents.all():
            if document.is_deleted:
                continue

            matched_documents.append(
                {
                    "id": document.id,
                    "document_code": document.document_code,
                    "title": document.title,
                    "document_date": document.document_date,
                    "author": document.author,
                    "page_start": document.page_start,
                    "page_end": document.page_end,
                    "summary": document.summary,
                }
            )

        match_type = self.detect_match_type(profile)

        return {
            "id": profile.id,
            "profile_code": profile.profile_code,
            "title": profile.title,
            "description": profile.description,
            "year": profile.year,
            "total_pages": profile.total_pages,
            "retention_period": profile.retention_period,
            "language": profile.language,
            "note": profile.note,

            "fond_id": fond.id if fond else None,
            "fond_code": fond.code if fond else None,
            "fond_name": fond.name if fond else None,

            "catalog_id": catalog.id if catalog else None,
            "catalog_code": catalog.code if catalog else None,
            "catalog_name": catalog.name if catalog else None,

            "warehouse_id": warehouse.id if warehouse else None,
            "warehouse_code": warehouse.code if warehouse else None,
            "warehouse_name": warehouse.name if warehouse else None,

            "location_id": location.id if location else None,
            "location_code": location.code if location else None,
            "location_name": location.name if location else None,

            "box_id": box.id if box else None,
            "box_number": box.box_number if box else None,
            "box_title": box.title if box else None,

            "storage_file_id": storage_file.id if storage_file else None,
            "storage_file_number": storage_file.file_number if storage_file else None,
            "storage_file_title": storage_file.title if storage_file else None,

            "pdf_preview_url": pdf_preview_url,
            "pdf_download_url": pdf_download_url,
            "digital_files": digital_files,
            "matched_documents": matched_documents,
            "match_type": match_type,
        }

    def detect_match_type(self, profile):
        """
        Đánh dấu loại dữ liệu hồ sơ có sẵn.

        Tạm thời dùng để frontend hiển thị nhãn:
        - Có hồ sơ
        - Có thành phần hồ sơ
        - Có PDF
        """

        match_type = ["profile"]

        if profile.documents.exists():
            match_type.append("document")

        if profile.digital_files.exists():
            match_type.append("pdf")

        return match_type
