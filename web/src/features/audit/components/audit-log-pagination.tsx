"use client";

import type { AuditLogPagination } from "@/features/audit/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AuditLogPaginationProps {
  pagination: AuditLogPagination | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  currentCount: number;
}

export function AuditLogPaginationBar({
  pagination,
  currentPage,
  onPageChange,
  isLoading,
  currentCount,
}: AuditLogPaginationProps) {
  const totalPages = pagination?.total_pages ?? 1;
  const total = pagination?.total ?? currentCount;

  return (
    <div className="flex flex-col justify-between gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center">
      <div>
        Đang hiển thị <strong>{currentCount}</strong> dòng
        {pagination ? (
          <>
            {" "}trên tổng <strong>{total}</strong> dòng
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Trước
        </Button>

        <span>
          Trang <strong>{currentPage}</strong>
          {pagination ? <> / {totalPages}</> : null}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            isLoading ||
            (pagination ? currentPage >= totalPages : currentCount === 0)
          }
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}