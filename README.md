# Hệ thống quản lý kho lưu trữ

Đây là đồ án xây dựng hệ thống hỗ trợ quản lý hồ sơ và tài liệu lưu trữ. Hệ thống cho phép quản lý thông tin hồ sơ, tài liệu số, kho lưu trữ, tìm kiếm dữ liệu và hỗ trợ OCR cho tài liệu số hóa.

## Chức năng chính

- Quản lý hồ sơ và tài liệu lưu trữ
- Quản lý kho, hộp và vị trí lưu trữ
- Tìm kiếm và tra cứu hồ sơ
- Tải lên và xem tài liệu số
- Hỗ trợ OCR nhận dạng nội dung tài liệu
- Nhập và xuất dữ liệu
- Thống kê và báo cáo
- Quản lý người dùng và phân quyền
- Ghi nhận nhật ký hoạt động hệ thống

## Công nghệ sử dụng

**Frontend:** Next.js, React, TypeScript, Tailwind CSS

**Backend:** Python, Django, Django REST Framework

**Cơ sở dữ liệu:** PostgreSQL, SQLite

**Khác:** Electron, OCR, Git, GitHub

## Cách chạy dự án

### Backend

```bash
cd api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd web
npm install
npm run dev
```

Mặc định:

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://localhost:3000`

## Tác giả

**Nguyễn Ngọc Bích Châu**  
Sinh viên Công nghệ Thông tin - Chuyên ngành Công nghệ Phần mềm  
GitHub: [Elys2105](https://github.com/Elys2105)
