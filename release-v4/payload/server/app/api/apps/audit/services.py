import json
from typing import Any

from django.db import DatabaseError, OperationalError, ProgrammingError
from django.utils.encoding import force_str

from apps.audit.models import AuditLog


SENSITIVE_KEYS = {
    "password",
    "old_password",
    "new_password",
    "confirm_password",
    "token",
    "access",
    "refresh",
    "authorization",
}


def mask_sensitive_data(value: Any):
    """
    Ẩn dữ liệu nhạy cảm và ép dữ liệu request/response về dạng JSON-safe.

    Quan trọng:
    - Multipart upload có UploadedFile trong request.data.
    - Nếu lưu thẳng UploadedFile vào JSONField sẽ gây HTTP 500.
    - Vì vậy file chỉ được lưu metadata: name, size, content_type.
    """
    if value is None:
        return None

    # UploadedFile hoặc object giống file.
    if hasattr(value, "name") and hasattr(value, "size") and (
        hasattr(value, "content_type") or hasattr(value, "file")
    ):
        return {
            "file_name": force_str(getattr(value, "name", "")),
            "file_size": getattr(value, "size", None),
            "content_type": force_str(getattr(value, "content_type", "")),
        }

    # QueryDict / MultiValueDict.
    if hasattr(value, "getlist") and hasattr(value, "keys"):
        cleaned = {}

        for key in value.keys():
            items = value.getlist(key)
            cleaned[key] = (
                mask_sensitive_data(items[0])
                if len(items) == 1
                else [mask_sensitive_data(item) for item in items]
            )

        return cleaned

    if isinstance(value, dict):
        cleaned = {}

        for key, item in value.items():
            lower_key = str(key).lower()

            if lower_key in SENSITIVE_KEYS:
                cleaned[key] = "***"
            else:
                cleaned[key] = mask_sensitive_data(item)

        return cleaned

    if isinstance(value, (list, tuple, set)):
        return [mask_sensitive_data(item) for item in value]

    if isinstance(value, (str, int, float, bool)):
        return value

    # Bất kỳ object lạ nào cũng phải convert string để JSONField không văng 500.
    try:
        json.dumps(value)
        return value
    except Exception:
        return force_str(value)


def safe_json_loads(raw_value):
    try:
        if not raw_value:
            return None

        if isinstance(raw_value, bytes):
            raw_value = raw_value.decode("utf-8", errors="ignore")

        return json.loads(raw_value)
    except Exception:
        return None


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")


def get_user_agent(request):
    return request.META.get("HTTP_USER_AGENT", "")


def get_authenticated_user_from_request(request):
    """
    Lấy user từ request.

    Với JWT, DRF thường set request.user trong quá trình xử lý view.
    Nếu chưa có, thử đọc Bearer token bằng SimpleJWT.
    """

    user = getattr(request, "user", None)

    if user and getattr(user, "is_authenticated", False):
        return user

    auth_header = request.META.get("HTTP_AUTHORIZATION", "")

    if not auth_header.startswith("Bearer "):
        return None

    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication

        raw_token = auth_header.replace("Bearer ", "").strip()
        jwt_authentication = JWTAuthentication()
        validated_token = jwt_authentication.get_validated_token(raw_token)

        return jwt_authentication.get_user(validated_token)
    except Exception:
        return None


def get_request_data(request):
    """
    Lấy dữ liệu request an toàn.

    Không lưu raw body của multipart để tránh lưu file/binary lớn vào DB.
    """

    content_type = request.META.get("CONTENT_TYPE", "")

    if "multipart/form-data" in content_type:
        files = []

        try:
            for field_name, file_obj in request.FILES.items():
                files.append(
                    {
                        "field": field_name,
                        "name": getattr(file_obj, "name", ""),
                        "size": getattr(file_obj, "size", None),
                        "content_type": getattr(file_obj, "content_type", ""),
                    }
                )
        except Exception:
            pass

        form_data = {}

        try:
            for key, value in request.POST.items():
                form_data[key] = value
        except Exception:
            pass

        return mask_sensitive_data(
            {
                "content_type": "multipart/form-data",
                "form": form_data,
                "files": files,
            }
        )

    try:
        parsed = safe_json_loads(request.body)
        return mask_sensitive_data(parsed)
    except Exception:
        return None


def get_response_data(response):
    """
    Lấy dữ liệu response nếu response là JSON nhỏ.
    """

    try:
        content_type = response.get("Content-Type", "")

        if "application/json" not in content_type:
            return None

        content = getattr(response, "content", b"")

        if not content:
            return None

        if len(content) > 20000:
            return {
                "message": "Response JSON quá lớn, không lưu chi tiết.",
                "size": len(content),
            }

        parsed = safe_json_loads(content)

        return mask_sensitive_data(parsed)
    except Exception:
        return None


def detect_action(request, response=None):
    """
    Tự nhận diện loại hành động từ method/path.
    """

    method = request.method.upper()
    path = request.path.lower()

    if "/api/auth/logout" in path:
        return AuditLog.Action.LOGOUT

    if "/api/digital-files/" in path and method == "POST":
        return AuditLog.Action.UPLOAD_PDF

    if "/api/digital-files/" in path and "/preview/" in path:
        return AuditLog.Action.PREVIEW_PDF

    if "/api/digital-files/" in path and "/download/" in path:
        return AuditLog.Action.DOWNLOAD_PDF

    if "/api/imports/" in path and method == "POST":
        return AuditLog.Action.IMPORT_EXCEL

    if "/api/exports/" in path and "excel" in path:
        return AuditLog.Action.EXPORT_EXCEL

    if "/api/exports/" in path and "pdf" in path:
        return AuditLog.Action.EXPORT_PDF

    if "/api/search/" in path:
        return AuditLog.Action.SEARCH

    if "/api/reports/dashboard/" in path:
        return AuditLog.Action.VIEW_DASHBOARD

    if "/api/archive-tree/" in path:
        return AuditLog.Action.VIEW_TREE

    if method == "POST":
        return AuditLog.Action.CREATE

    if method in {"PUT", "PATCH"}:
        return AuditLog.Action.UPDATE

    if method == "DELETE":
        return AuditLog.Action.DELETE

    return AuditLog.Action.API_CALL


def should_skip_path(path: str):
    path = path.lower()

    skipped_prefixes = [
        "/admin/",
        "/static/",
        "/media/",
        "/favicon.ico",
        "/api/audit-logs/",
        "/api/schema/",
        "/api/docs/",
    ]

    return any(path.startswith(prefix) for prefix in skipped_prefixes)


def should_log_request(request):
    """
    Quy tắc ghi audit log.

    Không log toàn bộ GET để tránh phình DB.
    Chỉ log:
    - POST/PUT/PATCH/DELETE
    - GET quan trọng: preview/download/export/search/report/archive-tree
    """

    path = request.path.lower()
    method = request.method.upper()

    if should_skip_path(path):
        return False

    if not path.startswith("/api/"):
        return False

    if method in {"POST", "PUT", "PATCH", "DELETE"}:
        return True

    important_get_patterns = [
        "/preview/",
        "/download/",
        "/api/exports/",
        "/api/search/",
        "/api/reports/dashboard/",
        "/api/archive-tree/",
    ]

    if method in {"GET", "HEAD"}:
        return any(pattern in path for pattern in important_get_patterns)

    return False


def extract_object_info(request, response_data=None):
    """
    Cố gắng lấy object_type/object_id/object_repr từ path hoặc response.
    """

    path = request.path.strip("/")
    parts = path.split("/")

    object_type = ""
    object_id = ""
    object_repr = ""

    if len(parts) >= 2:
        object_type = parts[1]

    if len(parts) >= 3 and str(parts[2]).isdigit():
        object_id = parts[2]

    if isinstance(response_data, dict):
        data = response_data.get("data")

        if isinstance(data, dict):
            if not object_id:
                object_id = force_str(data.get("id", "") or "")

            object_repr = force_str(
                data.get("name")
                or data.get("title")
                or data.get("profile_code")
                or data.get("document_code")
                or data.get("code")
                or ""
            )

    return object_type, object_id, object_repr[:500]


def create_audit_log_from_request(request, response):
    """
    Ghi audit log từ request/response.

    Hàm này được middleware gọi tự động.
    Nếu bảng chưa migrate hoặc DB lỗi thì bỏ qua, không làm hỏng API chính.
    """

    try:
        if not should_log_request(request):
            return None

        user = get_authenticated_user_from_request(request)

        if not user:
            return None

        request_data = get_request_data(request)
        response_data = get_response_data(response)
        object_type, object_id, object_repr = extract_object_info(
            request=request,
            response_data=response_data,
        )

        return AuditLog.objects.create(
            user=user,
            username=getattr(user, "username", "") or "",
            action=detect_action(request, response),
            method=request.method.upper(),
            path=request.get_full_path(),
            status_code=getattr(response, "status_code", None),
            object_type=object_type,
            object_id=object_id,
            object_repr=object_repr,
            request_data=request_data,
            response_data=response_data,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )

    except (OperationalError, ProgrammingError, DatabaseError):
        return None
    except Exception:
        return None