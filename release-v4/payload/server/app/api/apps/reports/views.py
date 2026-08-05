from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.responses import success_response
from apps.reports.services import get_dashboard_statistics
from apps.permissions.permissions import ReportPermission

class DashboardStatisticsView(APIView):
    """
    API thống kê tổng quan cho dashboard.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_dashboard_statistics()

        return success_response(
            message="Lấy dữ liệu dashboard thành công.",
            data=data,
        )