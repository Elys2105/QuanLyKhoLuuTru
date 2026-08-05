from rest_framework import status
from rest_framework.views import exception_handler

from apps.common.constants import ErrorCode
from apps.common.responses import error_response


class AppException(Exception):
    """
    Exception gốc của hệ thống.
    Các lỗi nghiệp vụ nên kế thừa class này.
    """

    default_code = ErrorCode.SERVER_ERROR
    default_message = "Có lỗi xảy ra"
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message=None, code=None, status_code=None, details=None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.status_code = status_code or self.status_code
        self.details = details
        super().__init__(self.message)


class ValidationException(AppException):
    default_code = ErrorCode.VALIDATION_ERROR
    default_message = "Dữ liệu không hợp lệ"
    status_code = status.HTTP_400_BAD_REQUEST


class NotFoundException(AppException):
    default_code = ErrorCode.NOT_FOUND
    default_message = "Không tìm thấy dữ liệu"
    status_code = status.HTTP_404_NOT_FOUND


class PermissionDeniedException(AppException):
    default_code = ErrorCode.PERMISSION_DENIED
    default_message = "Bạn không có quyền thực hiện thao tác này"
    status_code = status.HTTP_403_FORBIDDEN


class DuplicateDataException(AppException):
    default_code = ErrorCode.DUPLICATE_DATA
    default_message = "Dữ liệu đã tồn tại"
    status_code = status.HTTP_400_BAD_REQUEST


class ObjectLockedException(AppException):
    default_code = ErrorCode.OBJECT_LOCKED
    default_message = "Dữ liệu đã bị khóa, không thể chỉnh sửa"
    status_code = status.HTTP_400_BAD_REQUEST


def custom_exception_handler(exc, context):
    """
    Exception handler dùng chung cho DRF.

    Nhiệm vụ:
    - Nếu là AppException thì trả lỗi theo format chuẩn.
    - Nếu là lỗi DRF mặc định thì vẫn đưa về format chuẩn.
    """

    if isinstance(exc, AppException):
        return error_response(
            message=exc.message,
            code=exc.code,
            status_code=exc.status_code,
            details=exc.details,
        )

    response = exception_handler(exc, context)

    if response is not None:
        return error_response(
            message="Dữ liệu không hợp lệ",
            code=ErrorCode.VALIDATION_ERROR,
            status_code=response.status_code,
            details=response.data,
        )

    return error_response(
        message="Lỗi hệ thống",
        code=ErrorCode.SERVER_ERROR,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )