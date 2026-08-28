from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import uuid
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.responses import success_response
from apps.files.models import DigitalFile
from apps.ocr.models import OcrJob
from apps.ocr.runner import normalize_for_search
from apps.ocr.serializers import OcrJobSerializer
from apps.ocr.services import search_ocr_text
from apps.permissions.permissions import CanUploadDigitalFile, CanViewArchive, AuthenticatedSafeReadArchivePermission


def error_response(message, status_code=status.HTTP_400_BAD_REQUEST, details=None):
    return Response(
        {
            "success": False,
            "error": {
                "code": "OCR_ERROR",
                "message": message,
                "details": details or {},
            },
        },
        status=status_code,
    )


def create_job(digital_file, user, mode, pipeline_id):
    return OcrJob.objects.create(
        digital_file=digital_file,
        profile=digital_file.profile,
        document=digital_file.document,
        created_by=user if getattr(user, "is_authenticated", False) else None,
        status=OcrJob.Status.PENDING,
        ocr_mode=mode,
        pipeline_id=pipeline_id,
        engine="paddle-pending",
        language="vi",
        current_page=0,
        page_count=0,
        progress_percent=0,
        attempt_count=0,
        max_attempts=3,
        next_retry_at=None,
        started_at=None,
        finished_at=None,
    )


def get_best_ocr_job_for_file(digital_file_id):
    quality = (
        OcrJob.objects
        .filter(
            digital_file_id=digital_file_id,
            ocr_mode=OcrJob.Mode.QUALITY,
            status=OcrJob.Status.COMPLETED,
        )
        .order_by("-id")
        .first()
    )
    if quality:
        return quality

    fast = (
        OcrJob.objects
        .filter(
            digital_file_id=digital_file_id,
            ocr_mode=OcrJob.Mode.FAST,
            status=OcrJob.Status.COMPLETED,
        )
        .order_by("-id")
        .first()
    )
    if fast:
        return fast

    return (
        OcrJob.objects
        .filter(digital_file_id=digital_file_id)
        .order_by("-id")
        .first()
    )


class OcrJobListView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request):
        queryset = (
            OcrJob.objects
            .select_related("digital_file", "profile", "document", "created_by")
            .all()
        )

        q = request.query_params.get("q")
        status_value = request.query_params.get("status")
        mode_value = request.query_params.get("ocr_mode")
        digital_file_id = request.query_params.get("digital_file")
        profile_id = request.query_params.get("profile")
        document_id = request.query_params.get("document")

        if q:
            queryset = queryset.filter(
                Q(extracted_text__icontains=q)
                | Q(normalized_text__icontains=normalize_for_search(q))
                | Q(digital_file__original_name__icontains=q)
                | Q(profile__profile_code__icontains=q)
                | Q(profile__title__icontains=q)
                | Q(document__document_code__icontains=q)
                | Q(document__title__icontains=q)
            )

        if status_value:
            queryset = queryset.filter(status=status_value)

        if mode_value:
            queryset = queryset.filter(ocr_mode=mode_value)

        if digital_file_id:
            queryset = queryset.filter(digital_file_id=digital_file_id)

        if profile_id:
            queryset = queryset.filter(profile_id=profile_id)

        if document_id:
            queryset = queryset.filter(document_id=document_id)

        page = max(int(request.query_params.get("page", 1)), 1)
        page_size = min(max(int(request.query_params.get("page_size", 20)), 1), 100)

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        serializer = OcrJobSerializer(queryset[start:end], many=True)

        return success_response(
            message="Lấy danh sách OCR job thành công.",
            data={
                "results": serializer.data,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size,
                    "has_next": end < total,
                    "has_previous": page > 1,
                },
            },
        )


class OcrJobDetailView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request, pk):
        try:
            job = (
                OcrJob.objects
                .select_related("digital_file", "profile", "document", "created_by")
                .get(pk=pk)
            )
        except OcrJob.DoesNotExist:
            return error_response("Không tìm thấy OCR job.", status.HTTP_404_NOT_FOUND)

        return success_response(
            message="Lấy chi tiết OCR job thành công.",
            data=OcrJobSerializer(job).data,
        )


class OcrJobProgressView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request, pk):
        try:
            job = OcrJob.objects.get(pk=pk)
        except OcrJob.DoesNotExist:
            return error_response("Không tìm thấy OCR job.", status.HTTP_404_NOT_FOUND)

        return success_response(
            message="Lấy tiến trình OCR thành công.",
            data=OcrJobSerializer(job).data,
        )


class OcrDigitalFileProgressView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request, digital_file_id):
        jobs = (
            OcrJob.objects
            .filter(digital_file_id=digital_file_id)
            .order_by("-id")[:2]
        )

        return success_response(
            message="Lấy tiến trình OCR thành công.",
            data=OcrJobSerializer(jobs, many=True).data,
        )


def _v82_transaction():
    return __import__("django.db", fromlist=["transaction"]).transaction

def _v82_enqueue_fast_response(digital_file, user):
    with _v82_transaction().atomic():
        locked_file = DigitalFile.objects.select_for_update().get(pk=digital_file.pk, is_deleted=False)
        existing = OcrJob.objects.filter(digital_file=locked_file, ocr_mode=OcrJob.Mode.FAST, status__in=[OcrJob.Status.PENDING, OcrJob.Status.RUNNING, OcrJob.Status.COMPLETED]).order_by("-id").first()
        if existing is not None:
            fast_job = existing
        else:
            pipeline_id = __import__("uuid").uuid4()
            fast_job = create_job(locked_file, user, OcrJob.Mode.FAST, pipeline_id)
    return success_response(message="Đã xếp hàng OCR nhanh cho worker.", data={"fast_job": OcrJobSerializer(fast_job).data, "quality_job": None})

def _v82_enqueue_quality_response(digital_file, user):
    with _v82_transaction().atomic():
        locked_file = DigitalFile.objects.select_for_update().get(pk=digital_file.pk, is_deleted=False)
        fast_job = OcrJob.objects.filter(digital_file=locked_file, ocr_mode=OcrJob.Mode.FAST, status=OcrJob.Status.COMPLETED, pipeline_id__isnull=False).order_by("-finished_at", "-id").first()
        if fast_job is None:
            return error_response("OCR nhanh phải hoàn tất trước OCR chất lượng cao.", status.HTTP_400_BAD_REQUEST)
        existing = OcrJob.objects.filter(digital_file=locked_file, ocr_mode=OcrJob.Mode.QUALITY, pipeline_id=fast_job.pipeline_id).order_by("-id").first()
        if existing is not None:
            quality_job = existing
        else:
            quality_job = create_job(locked_file, user, OcrJob.Mode.QUALITY, fast_job.pipeline_id)
    return success_response(message="Đã xếp hàng OCR chất lượng cao cho worker.", data={"fast_job": OcrJobSerializer(fast_job).data, "quality_job": OcrJobSerializer(quality_job).data})

class OcrRunDigitalFileView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def post(self, request, digital_file_id):
        try:
            digital_file = DigitalFile.objects.select_related('profile', 'document').get(pk=digital_file_id, is_deleted=False)
        except DigitalFile.DoesNotExist:
            return error_response('Không tìm thấy file số hóa hoặc file đã bị xóa.', status.HTTP_404_NOT_FOUND)
        force = bool(request.data.get('force', False))
        if force:
            OcrJob.objects.filter(digital_file=digital_file, status__in=[OcrJob.Status.PENDING, OcrJob.Status.RUNNING]).update(status=OcrJob.Status.FAILED, error_message='Job cũ bị hủy do chạy lại OCR.', lease_owner='', lease_token=None, lease_expires_at=None, heartbeat_at=None, next_retry_at=None, finished_at=timezone.now())
        running = OcrJob.objects.filter(digital_file=digital_file, status__in=[OcrJob.Status.PENDING, OcrJob.Status.RUNNING]).order_by('-id')
        if running.exists() and (not force):
            return success_response(message='OCR đang chạy.', data={'jobs': OcrJobSerializer(running[:2], many=True).data, 'progress_url': f'/api/ocr/digital-files/{digital_file.id}/progress/', 'best_text_url': f'/api/ocr/digital-files/{digital_file.id}/text/'})
        pipeline_id = uuid.uuid4()
        requested_mode = str(request.data.get('ocr_mode') or request.data.get('mode') or 'fast').strip().lower()
        if requested_mode == 'quality':
            return _v82_enqueue_quality_response(digital_file, request.user)
        if requested_mode != 'fast':
            return error_response('Chế độ OCR không hợp lệ.', status.HTTP_400_BAD_REQUEST)
        return _v82_enqueue_fast_response(digital_file, request.user)


class OcrRunQualityDigitalFileView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def post(self, request, digital_file_id):
        try:
            digital_file = DigitalFile.objects.select_related('profile', 'document').get(pk=digital_file_id, is_deleted=False)
        except DigitalFile.DoesNotExist:
            return error_response('Không tìm thấy file số hóa hoặc file đã bị xóa.', status.HTTP_404_NOT_FOUND)
        force = bool(request.data.get('force', False))
        if force:
            OcrJob.objects.filter(digital_file=digital_file, status__in=[OcrJob.Status.PENDING, OcrJob.Status.RUNNING]).update(status=OcrJob.Status.FAILED, error_message='Job cũ bị hủy do chạy lại OCR.', lease_owner='', lease_token=None, lease_expires_at=None, heartbeat_at=None, next_retry_at=None, finished_at=timezone.now())
        running = OcrJob.objects.filter(digital_file=digital_file, status__in=[OcrJob.Status.PENDING, OcrJob.Status.RUNNING]).order_by('-id')
        if running.exists() and (not force):
            return success_response(message='OCR đang chạy.', data={'jobs': OcrJobSerializer(running[:2], many=True).data, 'progress_url': f'/api/ocr/digital-files/{digital_file.id}/progress/', 'best_text_url': f'/api/ocr/digital-files/{digital_file.id}/text/'})
        pipeline_id = uuid.uuid4()
        return _v82_enqueue_quality_response(digital_file, request.user)


class OcrDigitalFileTextView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request, digital_file_id):
        job = get_best_ocr_job_for_file(digital_file_id)

        if not job:
            return error_response(
                "File này chưa có kết quả OCR.",
                status.HTTP_404_NOT_FOUND,
            )

        return success_response(
            message="Lấy text OCR thành công.",
            data=OcrJobSerializer(job).data,
        )



class OcrDigitalFileDeleteView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def delete(self, request, digital_file_id):
        try:
            digital_file = DigitalFile.objects.get(
                pk=digital_file_id,
                is_deleted=False,
            )
        except DigitalFile.DoesNotExist:
            return error_response(
                "Không tìm thấy file số hóa hoặc file đã bị xóa.",
                status.HTTP_404_NOT_FOUND,
            )

        deleted_count, _ = OcrJob.objects.filter(
            digital_file=digital_file,
        ).delete()

        return success_response(
            message="Đã xóa bản OCR. Có thể chạy OCR lại.",
            data={
                "digital_file_id": digital_file_id,
                "deleted_count": deleted_count,
            },
        )
class OcrSearchView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request):
        q = request.query_params.get("q", "")

        if not q.strip():
            return error_response("Vui lòng nhập từ khóa q.", status.HTTP_400_BAD_REQUEST)

        jobs = search_ocr_text(q, limit=50)
        serializer = OcrJobSerializer(jobs, many=True)

        return success_response(
            message="Tìm kiếm OCR thành công.",
            data={
                "q": q,
                "results": serializer.data,
                "total": len(serializer.data),
            },
        )

# WEB-26: Suggest profile metadata from OCR text.
import re


def _web26_clean_line(line):
    return re.sub(r"\s+", " ", (line or "").strip())


def _web26_clean_text(text, limit=3000):
    text = re.sub(r"\r\n?", "\n", text or "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:limit]


def _web26_get_ocr_text(job):
    return (
        getattr(job, "extracted_text", "") or
        getattr(job, "normalized_text", "") or
        ""
    ).strip()


def _web26_get_meaningful_lines(text, limit=80):
    ignored_exact = {
        "ĐẢNG CỘNG SẢN VIỆT NAM",
        "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        "Độc lập - Tự do - Hạnh phúc",
    }

    lines = []

    for raw_line in re.split(r"\n+", text or ""):
        line = _web26_clean_line(raw_line)

        if not line:
            continue

        if line in ignored_exact:
            continue

        if re.match(r"^=+\s*PAGE\s+\d+\s*=+$", line, flags=re.IGNORECASE):
            continue

        if len(line) <= 2:
            continue

        lines.append(line)

        if len(lines) >= limit:
            break

    return lines


def _web26_extract_year(text):
    matches = re.findall(r"\b(19\d{2}|20\d{2})\b", text or "")

    if not matches:
        return None

    # Ưu tiên năm xuất hiện đầu tiên trong văn bản.
    try:
        return int(matches[0])
    except ValueError:
        return None


def _web26_extract_profile_code(lines, digital_file):
    # Ưu tiên bắt mã trên từng dòng để tránh ăn sang dòng kế tiếp.
    line_patterns = [
        r"^(?:Số|So)\s*[:：]?\s*(.+)$",
        r"^([0-9]{1,6}\s*/\s*[A-Za-z0-9ĐđƠơƯưÂâÊêÔôĂă./\-_]{2,80})$",
    ]

    for line in lines:
        clean_line = _web26_clean_line(line)

        for pattern in line_patterns:
            match = re.search(pattern, clean_line, flags=re.IGNORECASE)

            if not match:
                continue

            code = _web26_clean_line(match.group(1))

            # Cắt ở cụm mở đầu tiêu đề nếu OCR dính cùng dòng.
            code = re.split(
                r"\b(Về|Ve|V/v|Kính gửi|Kinh gui)\b",
                code,
                maxsplit=1,
                flags=re.IGNORECASE,
            )[0]

            code = code.strip(" :-–—.,;")
            code = code.replace(" ", "")

            # Chỉ giữ ký tự hợp lệ của mã văn bản/hồ sơ.
            code = re.sub(r"[^A-Za-z0-9ĐđƠơƯưÂâÊêÔôĂă./\-_]", "", code)

            if code:
                return code[:255]

    original_name = getattr(digital_file, "original_name", "") or ""

    if original_name:
        base_name = re.sub(r"\.[^.]+$", "", original_name)
        base_name = re.sub(r"[^A-Za-z0-9ĐđƠơƯưÂâÊêÔôĂă./\-_]+", "-", base_name)
        base_name = base_name.strip("-_.")

        if base_name:
            return base_name[:255]

    return ""

def _web26_extract_title(lines):
    # Ưu tiên dòng bắt đầu bằng "Về..." hoặc "V/v..."
    # Với OCR văn bản hành chính, tiêu đề thường nằm ngay sau dòng "Số ...".
    for index, line in enumerate(lines[:40]):
        clean_line = _web26_clean_line(line)

        if re.match(r"^(Về|Ve|V/v)\b", clean_line, flags=re.IGNORECASE):
            title_parts = [clean_line]

            # Ghép thêm 1-3 dòng sau nếu OCR tách tiêu đề thành nhiều dòng.
            for next_line in lines[index + 1:index + 4]:
                next_clean = _web26_clean_line(next_line)
                lowered = next_clean.lower()

                if not next_clean:
                    break

                if lowered.startswith((
                    "kính gửi",
                    "kinh gui",
                    "căn cứ",
                    "can cu",
                    "tiếp nhận",
                    "tiep nhan",
                    "qua rà soát",
                    "qua ra soat",
                )):
                    break

                if re.match(r"^(Số|So)\s*[:：]?", next_clean, flags=re.IGNORECASE):
                    break

                title_parts.append(next_clean)

            title = " ".join(title_parts)
            title = re.sub(r"\s+", " ", title).strip(" .,-–—")

            return title[:1000]

    title_patterns = [
        r"^(Báo cáo|Bao cao)\s+(.+)$",
        r"^(Công văn|Cong van)\s+(.+)$",
        r"^(Tờ trình|To trinh)\s+(.+)$",
        r"^(Quyết định|Quyet dinh)\s+(.+)$",
        r"^(Kế hoạch|Ke hoach)\s+(.+)$",
        r"^(Thông báo|Thong bao)\s+(.+)$",
    ]

    for line in lines:
        for pattern in title_patterns:
            match = re.search(pattern, line, flags=re.IGNORECASE)

            if match:
                return _web26_clean_line(line)[:1000]

    for line in lines[:25]:
        lowered = line.lower()

        if lowered.startswith(("số:", "so:", "kính gửi", "kinh gui")):
            continue

        if len(line) < 12:
            continue

        if re.match(r"^[0-9./\-_]+$", line):
            continue

        return line[:1000]

    return ""

def _web26_extract_description(text):
    clean_text = _web26_clean_text(text, limit=1800)

    if not clean_text:
        return ""

    lines = _web26_get_meaningful_lines(clean_text, limit=40)
    description = "\n".join(lines[:12]).strip()

    return description[:1500]


def _web26_compute_confidence(profile_code, title, year, text):
    score = 0

    if profile_code:
        score += 30

    if title:
        score += 35

    if year:
        score += 15

    if text and len(text.strip()) >= 300:
        score += 10

    if text and len(text.strip()) >= 1000:
        score += 10

    return min(score, 100)

# WEB-27/21.8: Suggest record metadata from OCR text for Bình Tiên archive flow.
import re
import unicodedata


def _web28_clean_line(line):
    return re.sub(r"\s+", " ", (line or "").strip())


def _web28_clean_text(text, limit=4000):
    text = re.sub(r"\r\n?", "\n", text or "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:limit]


def _web28_strip_accents(text):
    normalized = unicodedata.normalize("NFD", text or "")
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = normalized.replace("Đ", "D").replace("đ", "d")
    return normalized


def _web28_key(text):
    return _web28_strip_accents(text).upper()


def _web28_get_ocr_text(job):
    for field_name in [
        "extracted_text",
        "normalized_text",
        "text",
        "ocr_text",
        "result_text",
    ]:
        value = getattr(job, field_name, "") or ""
        if value.strip():
            return value.strip()

    return ""


def _web28_get_lines(text, limit=240):
    lines = []

    for raw_line in re.split(r"\n+", text or ""):
        line = _web28_clean_line(raw_line)

        if not line:
            continue

        if re.match(r"^=+\s*PAGE\s+\d+\s*=+$", line, flags=re.IGNORECASE):
            continue

        if len(line) <= 1:
            continue

        lines.append(line)

        if len(lines) >= limit:
            break

    return lines


def _web28_extract_year(text):
    matches = re.findall(r"\b(19\d{2}|20\d{2})\b", text or "")

    if not matches:
        return None

    try:
        return int(matches[0])
    except ValueError:
        return None


def _web28_extract_date(text):
    match = re.search(
        r"ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+((?:19|20)\d{2})",
        text or "",
        flags=re.IGNORECASE,
    )

    if not match:
        return None

    day, month, year = match.groups()

    try:
        return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
    except ValueError:
        return None


def _web28_normalize_document_code(code):
    code = _web28_clean_line(code)
    code = re.sub(r"\s*/\s*", "/", code)
    code = re.sub(r"\s*-\s*", "-", code)
    code = re.sub(r"\s+", "", code)
    code = code.strip(" .,:;")

    return code[:255]


def _web28_extract_document_code(lines, digital_file):
    joined = "\n".join(lines)

    patterns = [
        r"(?:Số|So)\s*[:：]?\s*([0-9]{1,6}\s*[-/]\s*[A-Za-z0-9ĐđƠơƯưÂâÊêÔôĂă./\-_]+)",
        r"\b([0-9]{1,6}\s*[-/]\s*[A-Za-z]{1,12}\s*/\s*[A-Za-z0-9ĐđƠơƯưÂâÊêÔôĂă./\-_]+)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, joined, flags=re.IGNORECASE)

        if match:
            return _web28_normalize_document_code(match.group(1))

    original_name = getattr(digital_file, "original_name", "") or ""

    if original_name:
        base_name = re.sub(r"\.[^.]+$", "", original_name)
        base_name = re.sub(r"[^A-Za-z0-9ĐđƠơƯưÂâÊêÔôĂă./\-_]+", "-", base_name)
        base_name = base_name.strip("-_.")
        if base_name:
            return base_name[:255]

    return ""


def _web28_split_number_symbol(document_code):
    code = document_code or ""

    match = re.match(r"^\s*([0-9]{1,6})[-/](.+)$", code)
    if not match:
        return "", ""

    number = match.group(1).strip()
    symbol = match.group(2).strip()

    return number, symbol


def _web28_extract_document_type(lines, document_code):
    code_key = _web28_key(document_code)

    if "-CV/" in code_key or "/CV" in code_key:
        return "Công văn"

    if "-BC/" in code_key or "/BC" in code_key:
        return "Báo cáo"

    if "-QD/" in code_key or "-QĐ/" in document_code.upper() or "/QD" in code_key:
        return "Quyết định"

    if "-KH/" in code_key or "/KH" in code_key:
        return "Kế hoạch"

    if "-TB/" in code_key or "/TB" in code_key:
        return "Thông báo"

    if "-TTR/" in code_key or "/TTR" in code_key:
        return "Tờ trình"

    title_map = [
        ("BAO CAO", "Báo cáo"),
        ("QUYET DINH", "Quyết định"),
        ("KE HOACH", "Kế hoạch"),
        ("THONG BAO", "Thông báo"),
        ("TO TRINH", "Tờ trình"),
        ("BIEN BAN", "Biên bản"),
    ]

    for line in lines[:80]:
        line_key = _web28_key(line)
        compact = re.sub(r"[^A-Z ]+", " ", line_key)
        compact = re.sub(r"\s+", " ", compact).strip()

        for marker, label in title_map:
            if compact == marker or compact.startswith(marker + " "):
                return label

    return ""


def _web28_extract_author(lines):
    head = "\n".join(lines[:30])
    key = _web28_key(head)

    has_party_city = (
        "DANG BO THANH PHO HO CHI MINH" in key
        or "DANG BO THANH PHO HCM" in key
        or "DANG BO TP HO CHI MINH" in key
        or "DANG BO" in key and "THANH PHO HO CHI MINH" in key
    )
    has_party_ward = "DANG UY PHUONG BINH TIEN" in key
    has_office = "VAN PHONG" in key

    if has_party_city and has_party_ward:
        return "ĐẢNG ỦY PHƯỜNG BÌNH TIÊN ĐẢNG BỘ THÀNH PHỐ HỒ CHÍ MINH"

    if has_party_ward and has_office:
        return "VĂN PHÒNG ĐẢNG ỦY PHƯỜNG BÌNH TIÊN"

    return ""


def _web28_is_separator(line):
    clean = _web28_clean_line(line)
    key = _web28_key(clean)

    if re.fullmatch(r"[-–—_=*. ]{3,}", clean):
        return True

    if key in {"-----", "----", "---"}:
        return True

    return False


def _web28_is_stop_after_summary(line):
    key = _web28_key(line)

    stop_prefixes = [
        "KINH GUI",
        "CAN CU",
        "THUC HIEN",
        "NOI NHAN",
        "I ",
        "I.",
        "1.",
        "1 ",
    ]

    return any(key.startswith(prefix) for prefix in stop_prefixes)


def _web28_find_line_index_containing_code(lines, document_code):
    code_key = _web28_key(document_code).replace(" ", "")

    if not code_key:
        return None

    for index, line in enumerate(lines):
        line_key = _web28_key(line).replace(" ", "")
        if code_key in line_key:
            return index

    return None


def _web28_collect_after_index(lines, start_index, max_lines=5):
    collected = []

    for line in lines[start_index + 1:start_index + 1 + max_lines + 8]:
        clean = _web28_clean_line(line)

        if not clean:
            if collected:
                break
            continue

        if _web28_is_separator(clean):
            break

        if collected and _web28_is_stop_after_summary(clean):
            break

        if len(clean) <= 2:
            continue

        collected.append(clean)

        if len(collected) >= max_lines:
            break

    return " ".join(collected).strip()


def _web28_extract_cv_summary(lines, document_code):
    code_index = _web28_find_line_index_containing_code(lines, document_code)

    if code_index is None:
        return ""

    collected = []

    for line in lines[code_index + 1:code_index + 12]:
        clean = _web28_clean_line(line)

        if not clean:
            if collected:
                break
            continue

        key = _web28_key(clean)

        if key.startswith("KINH GUI"):
            break

        if _web28_is_separator(clean):
            break

        if len(clean) <= 2:
            continue

        collected.append(clean)

        if len(collected) >= 4:
            break

    summary = " ".join(collected).strip()

    return summary[:1500]


def _web28_extract_title_based_summary(lines, document_type):
    markers_by_type = {
        "Báo cáo": ["BAO CAO"],
        "Quyết định": ["QUYET DINH"],
        "Kế hoạch": ["KE HOACH"],
        "Thông báo": ["THONG BAO"],
        "Tờ trình": ["TO TRINH"],
        "Biên bản": ["BIEN BAN"],
    }

    markers = markers_by_type.get(document_type, [])

    if not markers:
        return ""

    marker_index = None

    for index, line in enumerate(lines[:100]):
        line_key = _web28_key(line)
        compact = re.sub(r"[^A-Z ]+", " ", line_key)
        compact = re.sub(r"\s+", " ", compact).strip()

        if compact in markers:
            marker_index = index
            break

    if marker_index is None:
        return ""

    collected = []

    for line in lines[marker_index + 1:marker_index + 14]:
        clean = _web28_clean_line(line)

        if not clean:
            continue

        if _web28_is_separator(clean):
            break

        key = _web28_key(clean)

        if key.startswith(("CAN CU", "KINH GUI", "I.", "I ", "1.")):
            break

        collected.append(clean)

        if len(collected) >= 5:
            break

    summary = " ".join(collected).strip()

    return summary[:1500]


def _web28_extract_summary(lines, document_code, document_type):
    if document_type == "Công văn":
        summary = _web28_extract_cv_summary(lines, document_code)
        if summary:
            return summary

    summary = _web28_extract_title_based_summary(lines, document_type)
    if summary:
        return summary

    # Fallback rất hạn chế: lấy dòng có vẻ là tiêu đề, không lấy cả đoạn OCR dài.
    for line in lines[:60]:
        clean = _web28_clean_line(line)
        key = _web28_key(clean)

        if len(clean) < 12:
            continue

        if key.startswith(("DANG UY", "DANG BO", "CONG HOA", "DOC LAP", "SO ")):
            continue

        if _web28_is_separator(clean):
            continue

        return clean[:1000]

    return ""


def _web28_is_person_name(line):
    clean = _web28_clean_line(line)

    if not clean:
        return False

    key = _web28_key(clean)

    banned = [
        "NOI NHAN",
        "KINH GUI",
        "DANG UY",
        "DANG BO",
        "VAN PHONG",
        "CHU TICH",
        "BI THU",
        "PHO BI THU",
        "CHANH VAN PHONG",
        "Q CHANH VAN PHONG",
        "PHO CHANH VAN PHONG",
        "KT ",
        "TM ",
        "NGUOI KY",
        "KY TEN",
        "NOI DUNG",
        "THANH TOAN",
        "NOI DUNG THANH TOAN",
        "KHO BAC",
        "NGAN HANG",
        "SO TIEN",
        "MA DON VI",
        "CHUONG",
        "LOAI",
        "KHOAN",
        "MUC",
        "TIEU MUC",
        "DON VI",
        "TONG SO",
        "CON PHAI NOP",
        "DA NOP",
        "CHUYEN SANG",
    ]

    if any(item in key for item in banned):
        return False

    if re.search(r"\d", clean):
        return False

    words = clean.split()

    if len(words) < 2 or len(words) > 6:
        return False

    letters_only = re.sub(r"[^A-Za-zÀ-ỹĐđ\s]", "", clean).strip()

    if len(letters_only) < 5:
        return False

    alpha_words = [
        re.sub(r"[^A-Za-zÀ-ỹĐđ]", "", word)
        for word in words
    ]
    alpha_words = [word for word in alpha_words if word]

    if len(alpha_words) < 2:
        return False

    all_upper = all(word.upper() == word for word in alpha_words)
    title_case = all(word[:1].upper() == word[:1] for word in alpha_words)

    if not (all_upper or title_case):
        return False

    return True


def _web28_extract_signer(lines):
    signature_markers = [
        "Q CHANH VAN PHONG",
        "QUYEN CHANH VAN PHONG",
        "CHANH VAN PHONG",
        "PHO CHANH VAN PHONG",
        "BI THU",
        "PHO BI THU",
        "CHU TICH",
        "PHO CHU TICH",
        "TRUONG BAN",
        "PHO TRUONG BAN",
    ]

    stop_markers = (
        "NOI NHAN",
        "KINH GUI",
        "PHU LUC",
        "BANG",
        "DANH SACH",
        "NOI DUNG",
        "KHO BAC",
        "THANH TOAN",
        "SO TIEN",
    )

    # Ưu tiên vùng sau chức danh ký trong toàn bộ OCR text.
    # Không quét bừa cuối file vì sau trang ký có thể có phụ lục/bảng thanh toán.
    for index, line in enumerate(lines):
        key = _web28_key(line)
        normalized_key = re.sub(r"[^A-Z0-9 ]+", " ", key)
        normalized_key = re.sub(r"\s+", " ", normalized_key).strip()

        matched_marker = None

        for marker in signature_markers:
            if marker in normalized_key:
                matched_marker = marker
                break

        if not matched_marker:
            continue

        window = lines[index + 1:index + 26]

        for candidate in window:
            clean = _web28_clean_line(candidate)
            candidate_key = _web28_key(clean)

            if candidate_key.startswith(stop_markers):
                break

            if _web28_is_person_name(clean):
                return clean[:255]

    # Fallback: tìm những tên có họ phổ biến ở nửa sau văn bản, bỏ bảng thanh toán.
    vietnamese_family_names = (
        "NGUYEN",
        "TRAN",
        "LE",
        "PHAM",
        "HUYNH",
        "HOANG",
        "VO",
        "VU",
        "DANG",
        "BUI",
        "DO",
        "HO",
        "NGO",
        "DUONG",
        "LY",
    )

    start = max(int(len(lines) * 0.45), 0)

    for candidate in lines[start:]:
        clean = _web28_clean_line(candidate)
        key = _web28_key(clean)

        if any(bad in key for bad in [
            "NOI DUNG",
            "THANH TOAN",
            "KHO BAC",
            "SO TIEN",
            "MA DON VI",
            "TONG SO",
            "DA NOP",
            "CON PHAI NOP",
            "DANH SACH",
            "PHU LUC",
        ]):
            continue

        if not key.startswith(vietnamese_family_names):
            continue

        if _web28_is_person_name(clean):
            return clean[:255]

    return ""


def _web28_build_record_suggestion(digital_file, job, text):
    lines = _web28_get_lines(text)
    document_code = _web28_extract_document_code(lines, digital_file)
    document_number, document_symbol = _web28_split_number_symbol(document_code)
    document_type = _web28_extract_document_type(lines, document_code)
    summary = _web28_extract_summary(lines, document_code, document_type)

    title = summary or document_code or getattr(digital_file, "original_name", "") or ""
    author = _web28_extract_author(lines)
    signer = _web28_extract_signer(lines)
    document_date = _web28_extract_date(text)
    year = _web28_extract_year(text)

    confidence = 0

    if document_code:
        confidence += 25
    if document_type:
        confidence += 15
    if summary:
        confidence += 25
    if author:
        confidence += 15
    if signer:
        confidence += 10
    if document_date or year:
        confidence += 10

    confidence = min(confidence, 100)

    warnings = []

    if not document_code:
        warnings.append("Chưa nhận diện chắc chắn được số/ký hiệu văn bản.")

    if not summary:
        warnings.append("Chưa nhận diện chắc chắn được trích yếu nội dung.")

    if not signer:
        warnings.append("Chưa nhận diện chắc chắn được người ký từ vùng chữ ký.")

    if not author:
        warnings.append("Chưa nhận diện chắc chắn được tác giả/cơ quan ban hành.")

    return {
        "digital_file_id": digital_file.id,
        "digital_file_name": digital_file.original_name,
        "ocr_job_id": job.id,
        "ocr_status": job.status,
        "ocr_mode": getattr(job, "ocr_mode", ""),
        "source_profile_id": digital_file.profile_id,
        "source_document_id": digital_file.document_id,
        "suggestion": {
            # Legacy profile-suggestion fields giữ lại để không phá frontend cũ.
            "profile_code": document_code,
            "title": title,
            "description": summary,
            "year": year,
            "total_pages": getattr(job, "page_count", None) or digital_file.page_count or None,
            "retention_period": "Vĩnh viễn",
            "language": "Tiếng Việt",
            "notes": "",

            # Record fields mới.
            "document_identifier": document_code,
            "document_code": document_code,
            "document_number": document_number,
            "document_symbol": document_symbol,
            "document_type": document_type,
            "document_date": document_date,
            "author": author,
            "signer": signer,
            "summary": summary,
            "page_count": getattr(job, "page_count", None) or digital_file.page_count or None,
            "security_level": "Thường",
        },
        "missing_required_fields": [
            "catalog",
            "storage_file",
        ],
        "confidence": confidence,
        "warnings": warnings,
        "preview_text": _web28_clean_text(text, limit=1000),
    }


class OcrProfileSuggestionView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request, digital_file_id):
        try:
            digital_file = (
                DigitalFile.objects
                .select_related("profile", "document")
                .get(pk=digital_file_id, is_deleted=False)
            )
        except DigitalFile.DoesNotExist:
            return error_response(
                "Không tìm thấy file số hóa hoặc file đã bị xóa.",
                status.HTTP_404_NOT_FOUND,
            )

        job = get_best_ocr_job_for_file(digital_file_id)

        if not job:
            return error_response(
                "File này chưa có OCR. Hãy chạy OCR trước khi tạo gợi ý.",
                status.HTTP_404_NOT_FOUND,
            )

        text = _web28_get_ocr_text(job)

        if not text:
            return error_response(
                "OCR chưa có text để tạo gợi ý.",
                status.HTTP_404_NOT_FOUND,
                details={
                    "ocr_job_id": job.id,
                    "ocr_status": job.status,
                    "error_message": getattr(job, "error_message", ""),
                },
            )

        data = _web28_build_record_suggestion(
            digital_file=digital_file,
            job=job,
            text=text,
        )

        return success_response(
            message="Tạo gợi ý bản ghi từ OCR thành công.",
            data=data,
        )

class OcrDigitalFilePageImageView(APIView):
    permission_classes = [AuthenticatedSafeReadArchivePermission]

    def get(self, request, digital_file_id, page_number):
        """
        Trả ảnh PNG của một trang PDF để khối OCR nhìn đúng 100% như file gốc.

        Ghi chú:
        - Đây không phải iframe PDF preview.
        - Đây là ảnh từng trang dùng trong khối OCR.
        - Text OCR vẫn lấy từ endpoint /text/ để search/copy.
        """
        try:
            import fitz
        except Exception as exc:
            return error_response(
                "Máy chủ chưa có PyMuPDF để render ảnh trang PDF.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={"error": str(exc), "type": exc.__class__.__name__},
            )

        digital_file = get_object_or_404(
            DigitalFile.objects.select_related("profile", "document"),
            pk=digital_file_id,
            is_deleted=False,
        )

        if not digital_file.file:
            return error_response(
                "File số hóa chưa có dữ liệu vật lý.",
                status.HTTP_404_NOT_FOUND,
            )

        try:
            file_path = digital_file.file.path
        except Exception:
            file_path = ""

        if not file_path:
            return error_response(
                "Không xác định được đường dẫn file vật lý.",
                status.HTTP_404_NOT_FOUND,
            )

        if not digital_file.is_pdf:
            return error_response(
                "Chỉ hỗ trợ render ảnh trang cho PDF.",
                status.HTTP_400_BAD_REQUEST,
            )

        try:
            page_index = int(page_number) - 1

            if page_index < 0:
                raise ValueError("page_number must start from 1")

            pdf = fitz.open(file_path)

            if page_index >= pdf.page_count:
                return error_response(
                    "Số trang vượt quá số trang của PDF.",
                    status.HTTP_404_NOT_FOUND,
                    details={
                        "requested_page": page_number,
                        "page_count": pdf.page_count,
                    },
                )

            page = pdf.load_page(page_index)

            # 2.0x cho rõ chữ nhưng vẫn nhẹ hơn ảnh scan lớn.
            matrix = fitz.Matrix(2.0, 2.0)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            image_bytes = pixmap.tobytes("png")

            response = HttpResponse(image_bytes, content_type="image/png")
            response["Cache-Control"] = "private, max-age=3600"
            response["X-OCR-Page"] = str(page_number)
            response["X-OCR-Page-Count"] = str(pdf.page_count)

            pdf.close()

            return response

        except Exception as exc:
            return error_response(
                "Render ảnh trang PDF thất bại.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                details={
                    "digital_file_id": digital_file_id,
                    "page_number": page_number,
                    "error": str(exc),
                    "type": exc.__class__.__name__,
                },
            )

