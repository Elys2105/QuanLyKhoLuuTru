from django.db.models import Q, QuerySet

from apps.common.utils import normalize_search_text
from apps.documents.models import Document
from apps.ocr.models import OcrJob
from apps.profiles.models import Profile


def parse_bool(value):
    """
    Chuyển query string true/false sang boolean.
    """

    if value is None:
        return None

    value = str(value).strip().lower()

    if value in ["true", "1", "yes", "y"]:
        return True

    if value in ["false", "0", "no", "n"]:
        return False

    return None


def split_search_keywords(keyword: str) -> list[str]:
    """
    Tách từ khóa tìm kiếm thành nhiều token nhỏ.

    Ví dụ:
    - Người dùng nhập: "Báo cáo dân tộc"
    - Chuẩn hóa thành: "bao cao dan toc"
    - Tách thành: ["bao", "cao", "dan", "toc"]
    """

    normalized_keyword = normalize_search_text(keyword or "")
    return [word for word in normalized_keyword.split() if word.strip()]


def _normalized_variants(keyword: str) -> list[str]:
    raw = (keyword or "").strip()
    normalized = normalize_search_text(raw)
    values = []

    for value in [raw, normalized]:
        if value and value not in values:
            values.append(value)

    return values


def _profile_query_for_token(token: str) -> Q:
    query = Q()

    raw_fields = [
        "profile_code",
        "title",
        "description",
        "keywords",
        "storage_position_text",
        "note",
    ]

    normalized_fields = [
        "search_text",
    ]

    for value in _normalized_variants(token):
        for field_name in raw_fields:
            query |= Q(**{f"{field_name}__icontains": value})

    normalized_token = normalize_search_text(token)

    if normalized_token:
        for field_name in normalized_fields:
            query |= Q(**{f"{field_name}__icontains": normalized_token})

    return query


def _document_query_for_token(token: str) -> Q:
    query = Q()

    raw_fields = [
        "document_code",
        "document_number",
        "document_symbol",
        "title",
        "summary",
        "author",
        "signer",
        "note",
    ]

    normalized_fields = [
        "search_text",
    ]

    for value in _normalized_variants(token):
        for field_name in raw_fields:
            query |= Q(**{f"{field_name}__icontains": value})

    normalized_token = normalize_search_text(token)

    if normalized_token:
        for field_name in normalized_fields:
            query |= Q(**{f"{field_name}__icontains": normalized_token})

    return query


def _ocr_text_field_names() -> list[str]:
    excluded = {
        "status",
        "ocr_mode",
        "engine",
        "language",
        "error_message",
        "processing_message",
    }

    result = []

    for field in OcrJob._meta.get_fields():
        internal_type = getattr(field, "get_internal_type", lambda: "")()

        if internal_type in {"TextField", "CharField"} and field.name not in excluded:
            result.append(field.name)

    preferred = ["extracted_text", "normalized_text"]
    ordered = []

    for field_name in preferred + result:
        if field_name not in ordered and hasattr(OcrJob, field_name):
            ordered.append(field_name)

    return ordered


def _ocr_query_for_token(token: str) -> Q:
    query = Q()

    for value in _normalized_variants(token):
        for field_name in _ocr_text_field_names():
            query |= Q(**{f"{field_name}__icontains": value})

    return query


def _profile_ids_matching_document_token(token: str) -> set[int]:
    query = _document_query_for_token(token)

    if not query:
        return set()

    return set(
        Document.objects
        .filter(is_deleted=False)
        .filter(query)
        .exclude(profile_id__isnull=True)
        .values_list("profile_id", flat=True)
    )


def _profile_ids_matching_ocr_token(token: str) -> set[int]:
    query = _ocr_query_for_token(token)

    if not query:
        return set()

    completed_status = getattr(OcrJob.Status, "COMPLETED", "COMPLETED")

    jobs = (
        OcrJob.objects
        .select_related("profile", "document", "document__profile", "digital_file")
        .filter(status=completed_status)
        .filter(query)
    )

    profile_ids = set()

    for job in jobs.iterator(chunk_size=200):
        profile_id = getattr(job, "profile_id", None)

        if profile_id:
            profile_ids.add(profile_id)

        document = getattr(job, "document", None)

        if document and getattr(document, "profile_id", None):
            profile_ids.add(document.profile_id)

        digital_file = getattr(job, "digital_file", None)

        if digital_file:
            digital_profile_id = getattr(digital_file, "profile_id", None)

            if digital_profile_id:
                profile_ids.add(digital_profile_id)

            digital_document = getattr(digital_file, "document", None)

            if digital_document and getattr(digital_document, "profile_id", None):
                profile_ids.add(digital_document.profile_id)

    return profile_ids


def _apply_general_keyword_search(queryset: QuerySet, keyword: str) -> QuerySet:
    """
    q dùng cho tra cứu tổng:
    - tên/mã/nội dung hồ sơ
    - tên/số/ký hiệu/trích yếu/nội dung bản ghi
    - nội dung OCR trong PDF của bản ghi
    """

    tokens = split_search_keywords(keyword)

    if not tokens:
        return queryset

    for token in tokens:
        document_profile_ids = _profile_ids_matching_document_token(token)
        ocr_profile_ids = _profile_ids_matching_ocr_token(token)

        token_query = _profile_query_for_token(token)

        if document_profile_ids:
            token_query |= Q(id__in=document_profile_ids)

        if ocr_profile_ids:
            token_query |= Q(id__in=ocr_profile_ids)

        queryset = queryset.filter(token_query)

    return queryset.distinct()


def _apply_document_code_filter(queryset: QuerySet, document_code: str) -> QuerySet:
    document_code = (document_code or "").strip()

    if not document_code:
        return queryset

    document_profile_ids = (
        Document.objects
        .filter(is_deleted=False)
        .filter(
            Q(document_code__icontains=document_code)
            | Q(document_number__icontains=document_code)
            | Q(document_symbol__icontains=document_code)
        )
        .exclude(profile_id__isnull=True)
        .values_list("profile_id", flat=True)
    )

    return queryset.filter(id__in=document_profile_ids).distinct()


def _apply_document_title_filter(queryset: QuerySet, document_title: str) -> QuerySet:
    document_title = (document_title or "").strip()

    if not document_title:
        return queryset

    tokens = split_search_keywords(document_title)

    if not tokens:
        return queryset

    for token in tokens:
        document_profile_ids = _profile_ids_matching_document_token(token)
        ocr_profile_ids = _profile_ids_matching_ocr_token(token)

        token_query = Q()

        if document_profile_ids:
            token_query |= Q(id__in=document_profile_ids)

        if ocr_profile_ids:
            token_query |= Q(id__in=ocr_profile_ids)

        if token_query:
            queryset = queryset.filter(token_query)
        else:
            return queryset.none()

    return queryset.distinct()


def build_profile_search_queryset(params) -> QuerySet:
    """
    Tạo queryset tra cứu hồ sơ nâng cao.

    Hỗ trợ:
    - q: tìm tổng hợp trong hồ sơ, bản ghi, OCR
    - profile_code
    - title
    - document_code
    - document_title
    - fond/catalog/warehouse/location/box/storage_file
    - year
    - retention_period
    - has_pdf
    """

    queryset = (
        Profile.objects
        .select_related(
            "catalog",
            "catalog__fond",
            "storage_file",
            "storage_file__box",
            "storage_file__box__fond",
            "storage_file__box__catalog",
            "storage_file__box__location",
            "storage_file__box__location__warehouse",
        )
        .prefetch_related(
            "documents",
            "digital_files",
            "digital_files__document",
        )
        .filter(is_deleted=False)
    )

    q = (params.get("q") or "").strip()
    profile_code = (params.get("profile_code") or "").strip()
    title = (params.get("title") or params.get("profile_title") or "").strip()
    document_code = (params.get("document_code") or "").strip()
    document_title = (params.get("document_title") or "").strip()

    fond = (params.get("fond") or "").strip()
    catalog = (params.get("catalog") or "").strip()
    warehouse = (params.get("warehouse") or "").strip()
    location = (params.get("location") or "").strip()
    box = (params.get("box") or "").strip()
    box_number = (params.get("box_number") or "").strip()
    storage_file = (params.get("storage_file") or "").strip()
    file_number = (params.get("file_number") or "").strip()

    year = (params.get("year") or "").strip()
    retention_period = (params.get("retention_period") or "").strip()
    has_pdf = parse_bool(params.get("has_pdf"))

    if q:
        queryset = _apply_general_keyword_search(queryset, q)

    if profile_code:
        queryset = queryset.filter(profile_code__icontains=profile_code)

    if title:
        queryset = queryset.filter(
            Q(title__icontains=title)
            | Q(description__icontains=title)
            | Q(search_text__icontains=normalize_search_text(title))
        )

    if document_code:
        queryset = _apply_document_code_filter(queryset, document_code)

    if document_title:
        queryset = _apply_document_title_filter(queryset, document_title)

    if fond:
        queryset = queryset.filter(catalog__fond_id=fond)

    if catalog:
        queryset = queryset.filter(catalog_id=catalog)

    if warehouse:
        queryset = queryset.filter(storage_file__box__location__warehouse_id=warehouse)

    if location:
        queryset = queryset.filter(storage_file__box__location_id=location)

    if box:
        queryset = queryset.filter(storage_file__box_id=box)

    if box_number:
        queryset = queryset.filter(storage_file__box__box_number__icontains=box_number)

    if storage_file:
        queryset = queryset.filter(storage_file_id=storage_file)

    if file_number:
        queryset = queryset.filter(storage_file__file_number__icontains=file_number)

    if year:
        try:
            queryset = queryset.filter(year=int(year))
        except (TypeError, ValueError):
            queryset = queryset.none()

    if retention_period:
        queryset = queryset.filter(retention_period__icontains=retention_period)

    if has_pdf is True:
        queryset = queryset.filter(digital_files__is_deleted=False).distinct()

    if has_pdf is False:
        queryset = queryset.exclude(digital_files__is_deleted=False).distinct()

    return queryset.distinct().order_by(
        "storage_file__box__box_number",
        "storage_file__file_number",
        "profile_code",
        "id",
    )
