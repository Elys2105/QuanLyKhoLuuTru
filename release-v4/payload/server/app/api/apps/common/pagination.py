from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Pagination chuẩn cho API danh sách dùng trong REST_FRAMEWORK settings.

    Query params:
    - page: số trang
    - page_size: số bản ghi mỗi trang

    Ví dụ:
    /api/profiles/?page=1&page_size=20
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        return Response(
            {
                "success": True,
                "message": "Thành công",
                "data": data,
                "pagination": {
                    "page": self.page.number,
                    "page_size": self.get_page_size(self.request),
                    "total": self.page.paginator.count,
                    "total_pages": self.page.paginator.num_pages,
                    "has_next": self.page.has_next(),
                    "has_previous": self.page.has_previous(),
                },
            }
        )


class CustomPageNumberPagination(PageNumberPagination):
    """
    Pagination riêng dùng cho API search nâng cao.

    Class này không tự build response.
    Nó chỉ dùng để paginate queryset,
    còn response sẽ được build thủ công trong apps/search/views.py.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"