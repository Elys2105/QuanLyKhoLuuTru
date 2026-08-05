from dataclasses import dataclass


@dataclass
class ServiceResult:
    """
    Kết quả chuẩn cho service nghiệp vụ.

    Dùng khi một hàm service cần trả về:
    - có thành công không
    - dữ liệu là gì
    - lỗi là gì
    """

    success: bool
    data: object = None
    message: str = ""
    error_code: str = ""
    details: object = None