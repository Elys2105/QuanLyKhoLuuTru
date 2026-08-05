"use client";

import type { AuditLogFilters } from "@/features/audit/types";
import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLogFiltersProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onReset: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const ACTION_OPTIONS = [
  { value: "all", label: "Tất cả hành động" },
  { value: "CREATE", label: "Tạo mới" },
  { value: "UPDATE", label: "Cập nhật" },
  { value: "DELETE", label: "Xóa" },
  { value: "LOGIN", label: "Đăng nhập" },
  { value: "LOGOUT", label: "Đăng xuất" },
  { value: "UPLOAD", label: "Upload" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "IMPORT", label: "Import" },
  { value: "EXPORT", label: "Export" },
  { value: "OCR", label: "OCR" },
];

export function AuditLogFiltersCard({
  filters,
  onFiltersChange,
  onReset,
  onRefresh,
  isLoading,
}: AuditLogFiltersProps) {
  function updateFilter<K extends keyof AuditLogFilters>(
    key: K,
    value: AuditLogFilters[K],
  ) {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1,
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          <Label>Từ khóa</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.q ?? ""}
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="Tìm user, hành động, mô tả, IP..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Hành động</Label>
          <Select
            value={filters.action || "all"}
            onValueChange={(value) =>
              updateFilter("action", value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả hành động" />
            </SelectTrigger>

            <SelectContent>
              {ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>User</Label>
          <Input
            value={filters.user ?? ""}
            onChange={(event) => updateFilter("user", event.target.value)}
            placeholder="Admin, username..."
          />
        </div>

        <div className="space-y-2">
          <Label>Số dòng/trang</Label>
          <Select
            value={String(filters.page_size ?? 20)}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                page: 1,
                page_size: Number(value),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Từ ngày</Label>
          <Input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(event) => updateFilter("date_from", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Đến ngày</Label>
          <Input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(event) => updateFilter("date_to", event.target.value)}
          />
        </div>

        <div className="flex items-end gap-2 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={isLoading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Xóa lọc
          </Button>

          <Button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            Làm mới
          </Button>
        </div>
      </div>
    </div>
  );
}