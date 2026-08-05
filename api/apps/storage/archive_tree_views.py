from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.responses import success_response
from apps.storage.archive_tree_services import (
    build_archive_tree,
    get_archive_tree_flat_summary,
)


class ArchiveTreeView(APIView):
    """
    API trả cây lưu trữ đầy đủ.

    Endpoint:
    GET /api/archive-tree/

    Response:
    {
        "summary": {...},
        "tree": [
            {
                "id": 1,
                "code": "KHO-01",
                "locations": [
                    {
                        "id": 1,
                        "boxes": [
                            {
                                "id": 1,
                                "storage_files": [
                                    {
                                        "id": 1,
                                        "profiles": []
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = build_archive_tree(request=request)

        return success_response(
            message="Lấy cây lưu trữ thành công.",
            data=data,
        )


class ArchiveTreeSummaryView(APIView):
    """
    API thống kê nhanh cây lưu trữ theo kho.

    Endpoint:
    GET /api/archive-tree/summary/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_archive_tree_flat_summary()

        return success_response(
            message="Lấy thống kê cây lưu trữ thành công.",
            data=data,
        )