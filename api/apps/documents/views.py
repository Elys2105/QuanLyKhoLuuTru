import unicodedata
import re
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.exceptions import NotFound

from apps.common.views import BaseModelViewSet
from apps.documents.models import Document
from apps.permissions.permissions import AuthenticatedReadOnlyArchivePermission
from apps.documents.serializers import DocumentSerializer
from apps.ocr.models import OcrJob
from apps.common.utils import normalize_search_text



# STEP21_9D1_OCR_DOCUMENT_SEARCH_START
def _step219d1_document_field_names():
    return {
        field.name
        for field in Document._meta.get_fields()
        if getattr(field, "concrete", False)
    }


def _step219d1_text_query_for_document(keyword: str):
    fields = _step219d1_document_field_names()

    candidates = [
        "document_code",
        "document_identifier",
        "document_number",
        "document_symbol",
        "title",
        "summary",
        "author",
        "signer",
        "document_type",
        "copy_type",
        "language",
        "security_level",
        "attachment_note",
        "note",
        "notes",
        "search_text",
    ]

    query = Q()

    for field_name in candidates:
        if field_name in fields:
            query |= Q(**{f"{field_name}__icontains": keyword})

    normalized_keyword = normalize_search_text(keyword)

    if normalized_keyword and normalized_keyword != keyword:
        for field_name in ["search_text"]:
            if field_name in fields:
                query |= Q(**{f"{field_name}__icontains": normalized_keyword})

    return query


def _step219d1_loose_normalize_text(value: str) -> str:
    value = value or ""
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower()
    value = re.sub(r"[^0-9a-zA-Z]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def _step219d1_keyword_tokens(keyword: str) -> list[str]:
    normalized = _step219d1_loose_normalize_text(keyword)
    tokens = []

    for token in normalized.split():
        if len(token) < 2:
            continue

        if token not in tokens:
            tokens.append(token)

    return tokens


def _step219d1_ocr_text_field_names() -> list[str]:
    names = []

    for field in OcrJob._meta.get_fields():
        if not getattr(field, "concrete", False):
            continue

        internal_type = getattr(field, "get_internal_type", lambda: "")()

        if internal_type in {"TextField", "CharField"}:
            if field.name not in {"status", "ocr_mode", "engine", "error_message"}:
                names.append(field.name)

    return names


def _step219d1_get_ocr_job_text(job) -> str:
    parts = []

    for field_name in _step219d1_ocr_text_field_names():
        value = getattr(job, field_name, "") or ""

        if isinstance(value, str) and value.strip():
            parts.append(value)

    return "\n".join(parts)


def _step219d1_document_ids_matching_ocr(keyword: str) -> set[int]:
    tokens = _step219d1_keyword_tokens(keyword)

    if not tokens:
        return set()

    completed_status = getattr(OcrJob.Status, "COMPLETED", "COMPLETED")

    jobs = (
        OcrJob.objects
        .filter(status=completed_status)
        .filter(digital_file__isnull=False)
        .filter(digital_file__is_deleted=False)
        .filter(digital_file__document__isnull=False)
        .select_related("digital_file", "digital_file__document")
        .order_by("-id")
    )

    document_ids: set[int] = set()

    for job in jobs:
        text = _step219d1_get_ocr_job_text(job)

        if not text:
            continue

        haystack = _step219d1_loose_normalize_text(text)

        if all(token in haystack for token in tokens):
            document_id = getattr(job.digital_file, "document_id", None)

            if document_id:
                document_ids.add(int(document_id))

    return document_ids

def _step219d1_apply_document_search(queryset, keyword: str):
    keyword = (keyword or "").strip()

    if not keyword:
        return queryset

    document_query = _step219d1_text_query_for_document(keyword)
    ocr_document_ids = _step219d1_document_ids_matching_ocr(keyword)

    combined_query = document_query

    if ocr_document_ids:
        combined_query |= Q(id__in=ocr_document_ids)

    return queryset.filter(combined_query).distinct()


# STEP21_9D1_OCR_DOCUMENT_SEARCH_END


class DocumentViewSet(BaseModelViewSet):
    # VIEWER_SAFE_DOCUMENT_LOOKUP_START
    def get_object(self):
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        queryset = self.filter_queryset(self.get_queryset())

        model_fields = {field.name for field in queryset.model._meta.fields}
        candidates = []

        if lookup_value is not None:
            lookup_text = str(lookup_value)

            if lookup_text.isdigit():
                candidates.append(("pk", int(lookup_text)))

            for field_name in (
                "code",
                "document_code",
                "record_code",
                "file_code",
                "reference_code",
                "identifier",
            ):
                if field_name in model_fields:
                    candidates.append((field_name, lookup_text))

        obj = None

        for field_name, value in candidates:
            try:
                obj = queryset.filter(**{field_name: value}).first()
            except (TypeError, ValueError):
                obj = None

            if obj is not None:
                break

        if obj is None:
            raise NotFound("Không tìm thấy bản ghi.")

        self.check_object_permissions(self.request, obj)
        return obj
    # VIEWER_SAFE_DOCUMENT_LOOKUP_END

    permission_classes = [AuthenticatedReadOnlyArchivePermission]
    def get_queryset(self):
        queryset = Document.objects.select_related("profile").filter(is_deleted=False)
        params = self.request.query_params

        profile = (params.get("profile") or params.get("profile_id") or "").strip()
        if profile:
            queryset = queryset.filter(profile_id=profile)

        document_code = (params.get("document_code") or "").strip()
        if document_code:
            queryset = queryset.filter(document_code__icontains=document_code)

        title = (params.get("title") or "").strip()
        if title:
            queryset = queryset.filter(title__icontains=title)

        author = (params.get("author") or "").strip()
        if author:
            queryset = queryset.filter(author__icontains=author)

        year = (params.get("year") or "").strip()
        if year:
            queryset = queryset.filter(document_date__year=year)

        keyword = (params.get("search") or params.get("q") or "").strip()
        if keyword:
            queryset = _step219d1_apply_document_search(queryset, keyword)

        return queryset

    queryset = (
        Document.objects
        .select_related(
            "profile",
            "profile__catalog",
            "profile__catalog__fond",
        )
        .all()
    )
    serializer_class = DocumentSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "profile",
        "document_date",
        "document_type",
        "author",
        "signer",
        "copy_type",
        "language",
        "security_level",
        "is_deleted",
    ]
    search_fields = [
        "document_identifier",
        "document_code",
        "document_number",
        "document_symbol",
        "document_type",
        "title",
        "summary",
        "author",
        "signer",
        "copy_type",
        "language",
        "security_level",
        "page_number",
        "attachment_note",
        "digital_signature",
        "note",
        "search_text",
        "profile__profile_code",
        "profile__file_notation",
        "profile__title",
        "profile__catalog__code",
        "profile__catalog__name",
        "profile__catalog__fond__code",
        "profile__catalog__fond__name",
    ]
    ordering_fields = [
        "id",
        "profile",
        "order_in_profile",
        "document_identifier",
        "document_code",
        "document_number",
        "document_symbol",
        "document_type",
        "title",
        "document_date",
        "author",
        "signer",
        "security_level",
        "created_at",
        "updated_at",
    ]
    ordering = ["profile", "order_in_profile", "document_date", "document_code"]
    def filter_queryset(self, queryset):
        """
        STEP 21.9D1D:
        Skip DRF SearchFilter because get_queryset already handles
        search/q with metadata + OCR text. If SearchFilter runs again,
        OCR-only phrases such as 'Nộp BHXH' are filtered out.
        """
        for backend in list(getattr(self, "filter_backends", [])):
            backend_instance = backend()
            backend_name = backend_instance.__class__.__name__

            if backend_name == "SearchFilter":
                continue

            queryset = backend_instance.filter_queryset(self.request, queryset, self)

        return queryset

