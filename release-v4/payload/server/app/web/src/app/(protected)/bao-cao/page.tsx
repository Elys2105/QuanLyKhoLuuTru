"use client";

import { StorageHealthCard } from "@/features/system/storage-health-card";

import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

import { ReportBucketTable } from "@/features/reports/components/report-bucket-table";
import { ReportExportCard } from "@/features/reports/components/report-export-card";
import { ReportStatCards } from "@/features/reports/components/report-stat-cards";
import { useDashboardReport, useExportProfilesReport } from "@/features/reports/hooks/use-reports";
import type {
  ExportFormat,
  ReportFilters,
} from "@/features/reports/types";
import { normalizeDashboardStats } from "@/features/reports/utils/report-utils";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DEFAULT_FILTERS: ReportFilters = {
  q: "",
  fond: "",
  catalog: "",
  warehouse: "",
  year: "",
  retention_period: "",
  has_pdf: "all",
};

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const dashboardQuery = useDashboardReport();
  const exportMutation = useExportProfilesReport();

  const rawReport = dashboardQuery.data;
  const stats = normalizeDashboardStats(rawReport);

  async function handleExport(format: ExportFormat) {
    const fileName = await exportMutation.mutateAsync({
      format,
      filters,
    });

    setLastFileName(fileName);
  }

  return (
    <div className="space-y-6">
      <StorageHealthCard />
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-semibold">
            Báo cáo
          </h2>

          <p className="text-sm text-muted-foreground">
            Xem thống kê tổng quan và xuất danh sách hồ sơ ra Excel/PDF.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="w-fit">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Badge>

          <Button
            type="button"
            variant="outline"
            onClick={() => dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {dashboardQuery.isFetching ? "Đang tải..." : "Tải lại"}
          </Button>
        </div>
      </div>

      {dashboardQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              dashboardQuery.error,
              "Không tải được báo cáo dashboard.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <ReportStatCards
        stats={stats}
        isLoading={dashboardQuery.isLoading}
      />

      <ReportExportCard
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        isExporting={exportMutation.isPending}
        error={exportMutation.error}
        lastFileName={lastFileName}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <ReportBucketTable
          title="Hồ sơ theo năm"
          description="Nhóm hồ sơ theo năm hình thành hoặc năm thống kê nếu backend có trả dữ liệu."
          buckets={rawReport?.charts?.profiles_by_year ?? rawReport?.profiles_by_year}
        />

        <ReportBucketTable
          title="Hồ sơ theo thời hạn bảo quản"
          description="Thống kê hồ sơ theo thời hạn bảo quản."
          buckets={rawReport?.charts?.profiles_by_retention_period ?? rawReport?.profiles_by_retention_period}
        />

        <ReportBucketTable
          title="File theo loại MIME"
          description="Thống kê file số hóa theo định dạng."
          buckets={rawReport?.charts?.files_by_mime_type ?? rawReport?.files_by_mime_type}
        />
      </div>
    </div>
  );
}