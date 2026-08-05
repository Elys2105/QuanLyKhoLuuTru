"use client";

import type {
  ExportFormat,
  ReportFilters,
} from "@/features/reports/types";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportExportCardProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onExport: (format: ExportFormat) => Promise<void>;
  isExporting?: boolean;
  error?: unknown;
  lastFileName?: string | null;
}

export function ReportExportCard({
  filters,
  onFiltersChange,
  onExport,
  isExporting,
  error,
  lastFileName,
}: ReportExportCardProps) {
  function updateFilter<K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K],
  ) {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  }

  function handleReset() {
    onFiltersChange({
      q: "",
      fond: "",
      catalog: "",
      warehouse: "",
      year: "",
      retention_period: "",
      has_pdf: "all",
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <CardTitle>Xuất báo cáo hồ sơ</CardTitle>
            <p className="text-sm text-muted-foreground">
              Chọn điều kiện lọc rồi xuất danh sách hồ sơ ra Excel hoặc PDF.
            </p>
          </div>

          {lastFileName ? (
            <Badge variant="secondary">
              Đã tải: {lastFileName}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(
                error,
                "Xuất báo cáo thất bại.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Từ khóa</Label>
            <Input
              value={filters.q ?? ""}
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="Mã hồ sơ, tên hồ sơ, văn bản..."
            />
          </div>

          <div className="space-y-2">
            <Label>Năm</Label>
            <Input
              value={filters.year ?? ""}
              onChange={(event) => updateFilter("year", event.target.value)}
              placeholder="2025"
            />
          </div>

          <div className="space-y-2">
            <Label>Phông</Label>
            <Input
              value={filters.fond ?? ""}
              onChange={(event) => updateFilter("fond", event.target.value)}
              placeholder="ID hoặc mã phông"
            />
          </div>

          <div className="space-y-2">
            <Label>Mục lục</Label>
            <Input
              value={filters.catalog ?? ""}
              onChange={(event) => updateFilter("catalog", event.target.value)}
              placeholder="ID mục lục"
            />
          </div>

          <div className="space-y-2">
            <Label>Kho</Label>
            <Input
              value={filters.warehouse ?? ""}
              onChange={(event) => updateFilter("warehouse", event.target.value)}
              placeholder="ID kho"
            />
          </div>

          <div className="space-y-2">
            <Label>Thời hạn bảo quản</Label>
            <Input
              value={filters.retention_period ?? ""}
              onChange={(event) =>
                updateFilter("retention_period", event.target.value)
              }
              placeholder="20 năm, vĩnh viễn..."
            />
          </div>

          <div className="space-y-2">
            <Label>Trạng thái PDF</Label>
            <Select
              value={filters.has_pdf || "all"}
              onValueChange={(value) => updateFilter("has_pdf", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="true">Có PDF</SelectItem>
                <SelectItem value="false">Chưa có PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => onExport("excel")}
            disabled={isExporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting ? "Đang xuất..." : "Xuất Excel"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onExport("pdf")}
            disabled={isExporting}
          >
            <FileText className="mr-2 h-4 w-4" />
            Xuất PDF
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={isExporting}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Xóa lọc
          </Button>

          <div className="flex items-center text-sm text-muted-foreground">
            <Download className="mr-2 h-4 w-4" />
            File sẽ tự tải về máy sau khi backend trả dữ liệu.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}