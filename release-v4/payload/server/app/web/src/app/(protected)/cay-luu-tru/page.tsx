"use client";

import { RefreshCw } from "lucide-react";

import { ArchiveTreeSkeleton } from "@/features/archive-tree/components/archive-tree-skeleton";
import { ArchiveTreeSummaryCards } from "@/features/archive-tree/components/archive-tree-summary-cards";
import { ArchiveTreeView } from "@/features/archive-tree/components/archive-tree-view";
import { useArchiveTree } from "@/features/archive-tree/hooks/use-archive-tree";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ArchiveTreePage() {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useArchiveTree();

  if (isLoading) {
    return <ArchiveTreeSkeleton />;
  }

  const warehouses = data?.tree ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">
            Cây lưu trữ
          </h2>

          <p className="text-sm text-muted-foreground">
            Hiển thị cấu trúc Kho → Kệ / Vị trí → Hộp / Cặp → Tệp → Hồ sơ → PDF.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          {isFetching ? "Đang tải..." : "Tải lại"}
        </Button>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              error,
              "Không tải được cây lưu trữ.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <ArchiveTreeSummaryCards summary={data?.summary} />

      <Card>
        <CardHeader>
          <CardTitle>Cấu trúc lưu trữ</CardTitle>
        </CardHeader>

        <CardContent>
          <ArchiveTreeView warehouses={warehouses} />
        </CardContent>
      </Card>
    </div>
  );
}