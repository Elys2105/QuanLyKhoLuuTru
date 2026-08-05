from collections import defaultdict

from django.db.models import Count

from apps.files.models import DigitalFile
from apps.profiles.models import Profile
from apps.storage.models import StorageBox, StorageFile, StorageLocation, Warehouse


def build_absolute_url(request, path: str) -> str:
    """
    Tạo URL tuyệt đối nếu có request.

    Ví dụ:
    /api/digital-files/1/preview/
    =>
    http://127.0.0.1:8000/api/digital-files/1/preview/
    """

    if request:
        return request.build_absolute_uri(path)

    return path


def serialize_digital_file(digital_file, request=None):
    """
    Chuyển DigitalFile thành dict trả về cho frontend.

    Dùng endpoint an toàn:
    - preview_url
    - download_url

    Không dùng trực tiếp /media/... để frontend có thể đi qua quyền API.
    """

    preview_path = f"/api/digital-files/{digital_file.id}/preview/"
    download_path = f"/api/digital-files/{digital_file.id}/download/"

    return {
        "id": digital_file.id,
        "document_id": digital_file.document_id,
        "original_name": digital_file.original_name,
        "file_size": digital_file.file_size,
        "mime_type": digital_file.mime_type,
        "page_count": digital_file.page_count,
        "is_primary": digital_file.is_primary,
        "preview_url": build_absolute_url(request, preview_path),
        "download_url": build_absolute_url(request, download_path),
    }


def build_archive_tree(request=None):
    """
    Build cây lưu trữ đầy đủ:

    Warehouse/Kho
    → StorageLocation/Vị trí/Kệ
    → StorageBox/Hộp
    → StorageFile/Tệp
    → Profile/Hồ sơ
    → DigitalFile/PDF

    Chỉ lấy dữ liệu chưa xóa mềm:
    is_deleted=False
    """

    warehouses = list(
        Warehouse.objects
        .filter(is_deleted=False)
        .order_by("code", "id")
    )

    locations = list(
        StorageLocation.objects
        .filter(is_deleted=False)
        .select_related("warehouse")
        .order_by("warehouse__code", "code", "id")
    )

    boxes = list(
        StorageBox.objects
        .filter(is_deleted=False)
        .select_related("location", "fond", "catalog")
        .order_by("location__warehouse__code", "location__code", "box_number", "id")
    )

    storage_files = list(
        StorageFile.objects
        .filter(is_deleted=False)
        .select_related("box")
        .order_by("box__box_number", "file_number", "id")
    )

    profiles = list(
        Profile.objects
        .filter(is_deleted=False)
        .select_related(
            "catalog",
            "catalog__fond",
            "storage_file",
            "storage_file__box",
            "storage_file__box__location",
            "storage_file__box__location__warehouse",
        )
        .order_by("storage_file__box__box_number", "storage_file__file_number", "profile_code", "id")
    )

    digital_files = list(
        DigitalFile.objects
        .filter(is_deleted=False)
        .select_related("profile", "document")
        .order_by("profile_id", "-is_primary", "id")
    )

    locations_by_warehouse = defaultdict(list)
    boxes_by_location = defaultdict(list)
    files_by_box = defaultdict(list)
    profiles_by_file = defaultdict(list)
    digital_files_by_profile = defaultdict(list)

    for location in locations:
        locations_by_warehouse[location.warehouse_id].append(location)

    for box in boxes:
        boxes_by_location[box.location_id].append(box)

    for storage_file in storage_files:
        files_by_box[storage_file.box_id].append(storage_file)

    for profile in profiles:
        profiles_by_file[profile.storage_file_id].append(profile)

    for digital_file in digital_files:
        digital_files_by_profile[digital_file.profile_id].append(digital_file)

    tree = []

    total_counts = {
        "warehouses": len(warehouses),
        "locations": len(locations),
        "boxes": len(boxes),
        "storage_files": len(storage_files),
        "profiles": len(profiles),
        "digital_files": len(digital_files),
    }

    for warehouse in warehouses:
        warehouse_item = {
            "id": warehouse.id,
            "code": warehouse.code,
            "name": warehouse.name,
            "address": warehouse.address,
            "description": warehouse.description,
            "locations": [],
        }

        for location in locations_by_warehouse.get(warehouse.id, []):
            location_item = {
                "id": location.id,
                "warehouse_id": location.warehouse_id,
                "code": location.code,
                "name": location.name,
                "description": location.description,
                "boxes": [],
            }

            for box in boxes_by_location.get(location.id, []):
                box_item = {
                    "id": box.id,
                    "location_id": box.location_id,
                    "fond_id": box.fond_id,
                    "fond_code": box.fond.code if box.fond else None,
                    "fond_name": box.fond.name if box.fond else None,
                    "catalog_id": box.catalog_id,
                    "catalog_code": box.catalog.code if box.catalog else None,
                    "catalog_name": box.catalog.name if box.catalog else None,
                    "box_number": box.box_number,
                    "title": box.title,
                    "description": box.description,
                    "storage_files": [],
                }

                for storage_file in files_by_box.get(box.id, []):
                    file_item = {
                        "id": storage_file.id,
                        "box_id": storage_file.box_id,
                        "file_number": storage_file.file_number,
                        "title": storage_file.title,
                        "description": storage_file.description,
                        "profiles": [],
                    }

                    for profile in profiles_by_file.get(storage_file.id, []):
                        profile_digital_files = digital_files_by_profile.get(profile.id, [])

                        primary_file = None

                        for digital_file in profile_digital_files:
                            if digital_file.is_primary:
                                primary_file = digital_file
                                break

                        if primary_file is None and profile_digital_files:
                            primary_file = profile_digital_files[0]

                        profile_item = {
                            "id": profile.id,
                            "catalog_id": profile.catalog_id,
                            "storage_file_id": profile.storage_file_id,
                            "profile_code": profile.profile_code,
                            "title": profile.title,
                            "description": profile.description,
                            "start_date": profile.start_date,
                            "end_date": profile.end_date,
                            "year": profile.year,
                            "total_pages": profile.total_pages,
                            "retention_period": profile.retention_period,
                            "language": profile.language,
                            "note": profile.note,
                            "pdf_preview_url": (
                                build_absolute_url(
                                    request,
                                    f"/api/digital-files/{primary_file.id}/preview/",
                                )
                                if primary_file
                                else None
                            ),
                            "digital_files": [
                                serialize_digital_file(digital_file, request)
                                for digital_file in profile_digital_files
                            ],
                        }

                        file_item["profiles"].append(profile_item)

                    box_item["storage_files"].append(file_item)

                location_item["boxes"].append(box_item)

            warehouse_item["locations"].append(location_item)

        tree.append(warehouse_item)

    return {
        "summary": total_counts,
        "tree": tree,
    }


def get_archive_tree_flat_summary():
    """
    Thống kê nhanh theo từng kho.

    Có thể dùng cho frontend nếu muốn hiển thị số lượng dưới tên kho.
    """

    return list(
        Warehouse.objects
        .filter(is_deleted=False)
        .annotate(
            total_locations=Count("locations", distinct=True),
            total_boxes=Count("locations__boxes", distinct=True),
            total_files=Count("locations__boxes__storage_files", distinct=True),
            total_profiles=Count("locations__boxes__storage_files__profiles", distinct=True),
        )
        .values(
            "id",
            "code",
            "name",
            "total_locations",
            "total_boxes",
            "total_files",
            "total_profiles",
        )
        .order_by("code", "id")
    )