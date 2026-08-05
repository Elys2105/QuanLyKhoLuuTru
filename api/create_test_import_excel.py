from openpyxl import Workbook

path = "test_import_profiles.xlsx"

headers = [
    "fond_code",
    "fond_name",
    "catalog_code",
    "catalog_name",
    "year",
    "warehouse_code",
    "warehouse_name",
    "location_code",
    "location_name",
    "box_number",
    "box_title",
    "file_number",
    "file_title",
    "profile_code",
    "profile_title",
    "profile_description",
    "total_pages",
    "retention_period",
    "language",
    "note",
    "document_code",
    "document_title",
    "document_date",
    "author",
    "page_start",
    "page_end",
    "summary",
]

row = [
    "UBND-XA-B",
    "Ủy ban nhân dân xã B",
    "ML-2025",
    "Mục lục hồ sơ năm 2025",
    2025,
    "KHO-02",
    "Kho lưu trữ số 02",
    "KE-B",
    "Kệ B",
    "25",
    "Hộp hồ sơ số 25",
    "07",
    "Tệp hồ sơ số 07",
    "999/BC-UBND-TEST-IMPORT",
    "Báo cáo kiểm tra import Excel năm 2025",
    "Hồ sơ được tạo từ chức năng import Excel",
    30,
    "Vĩnh viễn",
    "Tiếng Việt",
    "Test import bước 11",
    "999/BC-UBND-TEST-IMPORT",
    "Báo cáo kiểm tra import Excel",
    "2025-01-15",
    "UBND xã B",
    1,
    30,
    "Tài liệu test import Excel bước 11",
]

wb = Workbook()
ws = wb.active
ws.title = "profiles_import"
ws.append(headers)
ws.append(row)
wb.save(path)

print(path)
