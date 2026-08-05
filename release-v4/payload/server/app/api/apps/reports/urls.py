from django.urls import path

from apps.reports.views import DashboardStatisticsView


app_name = "reports"

urlpatterns = [
    path(
        "dashboard/",
        DashboardStatisticsView.as_view(),
        name="dashboard-statistics",
    ),
]