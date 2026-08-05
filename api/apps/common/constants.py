class ErrorCode:
    """
    Mã lỗi dùng chung cho toàn bộ API.
    Dùng mã lỗi cố định giúp frontend xử lý lỗi dễ hơn.
    """

    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    SERVER_ERROR = "SERVER_ERROR"

    DUPLICATE_DATA = "DUPLICATE_DATA"
    INVALID_INPUT = "INVALID_INPUT"
    INVALID_FILE = "INVALID_FILE"

    OBJECT_LOCKED = "OBJECT_LOCKED"
    OBJECT_DELETED = "OBJECT_DELETED"


class ResponseMessage:
    """
    Message mặc định.
    """

    OK = "Thành công"
    CREATED = "Tạo mới thành công"
    UPDATED = "Cập nhật thành công"
    DELETED = "Xóa thành công"
    NOT_FOUND = "Không tìm thấy dữ liệu"
    VALIDATION_ERROR = "Dữ liệu không hợp lệ"
    PERMISSION_DENIED = "Bạn không có quyền thực hiện thao tác này"


class CommonStatus:
    """
    Trạng thái dùng chung cho nhiều nghiệp vụ.
    """

    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DRAFT = "DRAFT"
    LOCKED = "LOCKED"
    DELETED = "DELETED"