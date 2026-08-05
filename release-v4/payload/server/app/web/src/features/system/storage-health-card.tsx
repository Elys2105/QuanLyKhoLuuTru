"use client";

import { AlertTriangle, Database, HardDrive, RefreshCw } from "lucide-react";

import { useStorageHealth } from "@/features/system/use-storage-health";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getBarWidth(value?: number): string {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return `${safeValue}%`;
}

export function StorageHealthCard() {
  const storageQuery = useStorageHealth(false);
  const data = storageQuery.data;

  const usedPercent = data ? Math.max(0, 100 - data.free_percent) : 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Dung lượng lưu trữ
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi ổ lưu tài liệu số, PDF/OCR và dữ liệu media. Mục tiêu WEB-24: sẵn sàng cho 500GB/TB.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {data ? (
              <>
                <Badge variant={data.supports_500gb ? "default" : "destructive"}>
                  {data.supports_500gb ? "Đạt 500GB+" : "Chưa đạt 500GB"}
                </Badge>

                <Badge variant={data.supports_1tb ? "default" : "outline"}>
                  {data.supports_1tb ? "Đạt 1TB+" : "Chưa đạt 1TB"}
                </Badge>
              </>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={storageQuery.isFetching}
              onClick={() => storageQuery.refetch()}
            >
              <RefreshCw className={storageQuery.isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Kiểm tra lại
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {storageQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(
                storageQuery.error,
                "Không tải được thông tin dung lượng lưu trữ.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {!data && storageQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">
            Đang kiểm tra dung lượng lưu trữ...
          </div>
        ) : null}

        {data ? (
          <>
            {data.status !== "ok" ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {data.warnings.length > 0
                    ? data.warnings.join(" ")
                    : "Có cảnh báo về dung lượng lưu trữ."}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">
                  Tổng dung lượng ổ
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {data.total_display}
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">
                  Đã dùng
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {data.used_display}
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">
                  Còn trống
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {data.free_display}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Đã dùng khoảng {usedPercent.toFixed(2)}%</span>
                <span>Còn trống {data.free_percent.toFixed(2)}%</span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: getBarWidth(usedPercent) }}
                />
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Database className="h-4 w-4" />
                Thư mục lưu trữ
              </div>

              <div className="mt-1 break-all text-muted-foreground">
                {data.storage_root}
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Mốc mục tiêu: {data.target_display} · Ngưỡng cảnh báo còn trống: {data.low_free_display}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(data.subfolders).slice(0, 12).map(([name, ok]) => (
                <Badge key={name} variant={ok ? "secondary" : "destructive"}>
                  {name}
                </Badge>
              ))}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}