import re
import unicodedata


def remove_vietnamese_accents(text):
    """
    Bỏ dấu tiếng Việt.

    Ví dụ:
    "Báo cáo công tác dân tộc"
    -> "Bao cao cong tac dan toc"
    """

    if text is None:
        return ""

    text = str(text)

    text = unicodedata.normalize("NFD", text)
    text = "".join(
        char for char in text if unicodedata.category(char) != "Mn"
    )

    text = text.replace("Đ", "D").replace("đ", "d")

    return text


def normalize_search_text(text):
    """
    Chuẩn hóa text để tìm kiếm.

    Làm các việc:
    - Chuyển None thành chuỗi rỗng
    - Bỏ dấu tiếng Việt
    - Chuyển về chữ thường
    - Thay ký tự đặc biệt bằng khoảng trắng
    - Xóa khoảng trắng thừa

    Ví dụ:
    "235/BC-ĐU: Báo cáo Công tác"
    -> "235 bc du bao cao cong tac"
    """

    if text is None:
        return ""

    text = remove_vietnamese_accents(text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def str_to_bool(value):
    """
    Chuyển chuỗi sang boolean.

    Dùng khi đọc query params hoặc .env.
    """

    if isinstance(value, bool):
        return value

    if value is None:
        return False

    return str(value).lower() in ["true", "1", "yes", "y"]