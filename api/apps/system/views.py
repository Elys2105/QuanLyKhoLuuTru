import os
import shutil
from pathlib import Path

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


STORAGE_SUBFOLDERS = [
    "documents",
    "documents/pdf",
    "documents/word",
    "documents/excel",
    "ocr",
    "ocr/text",
    "ocr/jobs",
    "imports",
    "exports",
    "temp",
    "thumbnails",
    "quarantine",
    "backups",
]


def format_bytes(size: int | None) -> str:
    if size is None:
        return "-"

    value = float(size)
    units = ["B", "KB", "MB", "GB", "TB", "PB"]

    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.2f} {unit}"

        value = value / 1024

    return f"{size} B"


def ensure_storage_layout(root: Path) -> dict[str, bool]:
    result: dict[str, bool] = {}

    root.mkdir(parents=True, exist_ok=True)

    for relative_path in STORAGE_SUBFOLDERS:
        target = root / relative_path
        target.mkdir(parents=True, exist_ok=True)
        result[relative_path] = target.exists() and target.is_dir()

    return result


def scan_directory_size(root: Path, max_files: int = 20000) -> tuple[int, int, bool]:
    total_size = 0
    file_count = 0
    truncated = False
    stack = [root]

    while stack:
        current = stack.pop()

        try:
            with os.scandir(current) as entries:
                for entry in entries:
                    try:
                        if entry.is_dir(follow_symlinks=False):
                            stack.append(Path(entry.path))
                            continue

                        if entry.is_file(follow_symlinks=False):
                            total_size += entry.stat(follow_symlinks=False).st_size
                            file_count += 1

                            if file_count >= max_files:
                                truncated = True
                                return total_size, file_count, truncated
                    except OSError:
                        continue
        except OSError:
            continue

    return total_size, file_count, truncated


class StorageHealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        media_root = Path(settings.MEDIA_ROOT)
        scan = request.query_params.get("scan") == "1"

        try:
            subfolders = ensure_storage_layout(media_root)
            disk_usage = shutil.disk_usage(str(media_root))

            free_percent = (
                round((disk_usage.free / disk_usage.total) * 100, 2)
                if disk_usage.total
                else 0
            )

            warning_percent = getattr(settings, "ARCHIVE_STORAGE_WARNING_PERCENT", 10)
            low_free_bytes = getattr(
                settings,
                "ARCHIVE_STORAGE_LOW_FREE_BYTES",
                20 * 1024 * 1024 * 1024,
            )
            target_bytes = getattr(
                settings,
                "ARCHIVE_STORAGE_TARGET_BYTES",
                500 * 1024 * 1024 * 1024,
            )

            status = "ok"
            warnings = []

            if disk_usage.total < target_bytes:
                status = "warning"
                warnings.append(
                    "Ổ lưu trữ hiện tại nhỏ hơn mốc mục tiêu 500GB/TB đã cấu hình."
                )

            if disk_usage.free < low_free_bytes:
                status = "warning"
                warnings.append("Dung lượng trống dưới ngưỡng an toàn.")

            if free_percent < warning_percent:
                status = "warning"
                warnings.append("Phần trăm dung lượng trống thấp.")

            scanned_bytes = None
            scanned_file_count = None
            scan_truncated = False

            if scan:
                scanned_bytes, scanned_file_count, scan_truncated = scan_directory_size(
                    media_root,
                )

            return Response(
                {
                    "ok": True,
                    "status": status,
                    "storage_root": str(media_root),
                    "media_root": str(media_root),
                    "media_url": getattr(settings, "MEDIA_URL", "/media/"),
                    "total_bytes": disk_usage.total,
                    "used_bytes": disk_usage.used,
                    "free_bytes": disk_usage.free,
                    "free_percent": free_percent,
                    "total_display": format_bytes(disk_usage.total),
                    "used_display": format_bytes(disk_usage.used),
                    "free_display": format_bytes(disk_usage.free),
                    "target_bytes": target_bytes,
                    "target_display": format_bytes(target_bytes),
                    "supports_500gb": disk_usage.total >= 500 * 1024 * 1024 * 1024,
                    "supports_1tb": disk_usage.total >= 1024 * 1024 * 1024 * 1024,
                    "low_free_bytes": low_free_bytes,
                    "low_free_display": format_bytes(low_free_bytes),
                    "subfolders": subfolders,
                    "scan_enabled": scan,
                    "scanned_bytes": scanned_bytes,
                    "scanned_display": format_bytes(scanned_bytes),
                    "scanned_file_count": scanned_file_count,
                    "scan_truncated": scan_truncated,
                    "warnings": warnings,
                },
            )
        except Exception as exc:
            return Response(
                {
                    "ok": False,
                    "status": "error",
                    "storage_root": str(media_root),
                    "error": str(exc),
                },
                status=500,
            )
