"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { AuditLogFiltersCard } from "@/features/audit/components/audit-log-filters";
import { AuditLogPaginationBar } from "@/features/audit/components/audit-log-pagination";
import { AuditLogTable } from "@/features/audit/components/audit-log-table";
import { useAuditLogs } from "@/features/audit/hooks/use-audit-logs";
import type { AuditLogFilters } from "@/features/audit/types";
import { filterAuditLogsClientSide } from "@/features/audit/utils/audit-utils";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEFAULT_FILTERS: AuditLogFilters = {
  q: "",
  action: "",
  user: "",
  date_from: "",
  date_to: "",
  page: 1,
  page_size: 20,
};

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>(DEFAULT_FILTERS);

  const auditLogsQuery = useAuditLogs(filters);

  const rawLogs = auditLogsQuery.data?.results ?? [];

  const logs = useMemo(() => {
    return filterAuditLogsClientSide(rawLogs, {
      q: filters.q,
      action: filters.action,
      user: filters.user,
      date_from: filters.date_from,
      date_to: filters.date_to,
    });
  }, [
    rawLogs,
    filters.q,
    filters.action,
    filters.user,
    filters.date_from,
    filters.date_to,
  ]);

  function handlePageChange(page: number) {
    setFilters((current) => ({
      ...current,
      page,
    }));
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-semibold">
            Nhật ký hệ thống
          </h2>

          <p className="text-sm text-muted-foreground">
            Xem lịch sử thao tác, lọc theo hành động, user và thời gian.
          </p>
        </div>

        <Badge variant="secondary" className="w-fit">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Audit log
        </Badge>
      </div>

      <AuditLogFiltersCard
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        onRefresh={() => auditLogsQuery.refetch()}
        isLoading={auditLogsQuery.isLoading || auditLogsQuery.isFetching}
      />

      {auditLogsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              auditLogsQuery.error,
              "Không tải được nhật ký hệ thống.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div>
              <CardTitle>Danh sách nhật ký</CardTitle>
              <p className="text-sm text-muted-foreground">
                Dữ liệu lấy từ API /api/audit-logs/.
              </p>
            </div>

            {auditLogsQuery.isFetching ? (
              <Badge variant="outline">Đang tải...</Badge>
            ) : (
              <Badge variant="outline">Sẵn sàng</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <AuditLogTable
            logs={logs}
            isLoading={auditLogsQuery.isLoading}
          />

          <AuditLogPaginationBar
            pagination={auditLogsQuery.data?.pagination ?? null}
            currentPage={filters.page ?? 1}
            onPageChange={handlePageChange}
            isLoading={auditLogsQuery.isLoading || auditLogsQuery.isFetching}
            currentCount={logs.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}