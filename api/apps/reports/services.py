from django.db.models import Count, Sum

from apps.catalogs.models import Catalog
from apps.documents.models import Document
from apps.files.models import DigitalFile
from apps.fonds.models import Fond
from apps.profiles.models import Profile
from apps.storage.models import StorageBox, StorageFile, Warehouse


def safe_int(value):
    """
    Đảm bảo giá trị None thành 0.
    """

    return value or 0


def get_dashboard_statistics():
    """
    Tổng hợp dữ liệu thống kê cho dashboard.
    """

    total_fonds = Fond.objects.filter(is_deleted=False).count()
    total_catalogs = Catalog.objects.filter(is_deleted=False).count()
    total_warehouses = Warehouse.objects.filter(is_deleted=False).count()
    total_boxes = StorageBox.objects.filter(is_deleted=False).count()
    total_storage_files = StorageFile.objects.filter(is_deleted=False).count()
    total_profiles = Profile.objects.filter(is_deleted=False).count()
    total_documents = Document.objects.filter(is_deleted=False).count()
    total_digital_files = DigitalFile.objects.filter(is_deleted=False).count()

    total_pdf_size = (
        DigitalFile.objects
        .filter(is_deleted=False)
        .aggregate(total=Sum("file_size"))
        .get("total")
    )

    profiles_by_year = list(
        Profile.objects
        .filter(is_deleted=False)
        .values("year")
        .annotate(total=Count("id"))
        .order_by("-year")
    )

    profiles_by_fond = list(
        Profile.objects
        .filter(is_deleted=False)
        .values(
            "catalog__fond_id",
            "catalog__fond__code",
            "catalog__fond__name",
        )
        .annotate(total=Count("id"))
        .order_by("catalog__fond__code")
    )

    boxes_by_warehouse = list(
        StorageBox.objects
        .filter(is_deleted=False)
        .values(
            "location__warehouse_id",
            "location__warehouse__code",
            "location__warehouse__name",
        )
        .annotate(total=Count("id"))
        .order_by("location__warehouse__code")
    )

    latest_profiles = list(
        Profile.objects
        .filter(is_deleted=False)
        .select_related(
            "catalog",
            "catalog__fond",
            "storage_file",
            "storage_file__box",
        )
        .order_by("-created_at")[:10]
        .values(
            "id",
            "profile_code",
            "title",
            "year",
            "catalog__fond__code",
            "catalog__fond__name",
            "storage_file__box__box_number",
            "storage_file__file_number",
            "created_at",
        )
    )

    latest_digital_files = list(
        DigitalFile.objects
        .filter(is_deleted=False)
        .select_related("profile", "document")
        .order_by("-created_at")[:10]
        .values(
            "id",
            "profile_id",
            "profile__profile_code",
            "profile__title",
            "document_id",
            "document__title",
            "original_name",
            "file_size",
            "mime_type",
            "is_primary",
            "created_at",
        )
    )

    return {
        "summary": {
            "total_fonds": total_fonds,
            "total_catalogs": total_catalogs,
            "total_warehouses": total_warehouses,
            "total_boxes": total_boxes,
            "total_storage_files": total_storage_files,
            "total_profiles": total_profiles,
            "total_documents": total_documents,
            "total_digital_files": total_digital_files,
            "total_pdf_size": safe_int(total_pdf_size),
        },
        "charts": {
            "profiles_by_year": profiles_by_year,
            "profiles_by_fond": [
                {
                    "fond_id": item["catalog__fond_id"],
                    "fond_code": item["catalog__fond__code"],
                    "fond_name": item["catalog__fond__name"],
                    "total": item["total"],
                }
                for item in profiles_by_fond
            ],
            "boxes_by_warehouse": [
                {
                    "warehouse_id": item["location__warehouse_id"],
                    "warehouse_code": item["location__warehouse__code"],
                    "warehouse_name": item["location__warehouse__name"],
                    "total": item["total"],
                }
                for item in boxes_by_warehouse
            ],
        },
        "latest": {
            "profiles": [
                {
                    "id": item["id"],
                    "profile_code": item["profile_code"],
                    "title": item["title"],
                    "year": item["year"],
                    "fond_code": item["catalog__fond__code"],
                    "fond_name": item["catalog__fond__name"],
                    "box_number": item["storage_file__box__box_number"],
                    "file_number": item["storage_file__file_number"],
                    "created_at": item["created_at"],
                }
                for item in latest_profiles
            ],
            "digital_files": [
                {
                    "id": item["id"],
                    "profile_id": item["profile_id"],
                    "profile_code": item["profile__profile_code"],
                    "profile_title": item["profile__title"],
                    "document_id": item["document_id"],
                    "document_title": item["document__title"],
                    "original_name": item["original_name"],
                    "file_size": item["file_size"],
                    "mime_type": item["mime_type"],
                    "is_primary": item["is_primary"],
                    "created_at": item["created_at"],
                }
                for item in latest_digital_files
            ],
        },
    }