"use client";

import type { DashboardReportStats } from "@/features/reports/types";
import { formatNumber } from "@/features/reports/utils/report-utils";
import {
  Archive,
  Boxes,
  Building2,
  FileText,
  FolderArchive,
  Layers,
  ScanText,
  Warehouse,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportStatCardsProps {
  stats: DashboardReportStats;
  isLoading?: boolean;
}

const STAT_ITEMS = [
  {
    key: "totalProfiles",
    title: "Tổng hồ sơ",
    icon: FolderArchive,
  },
  {
    key: "totalDocuments",
    title: "Tổng văn bản",
    icon: FileText,
  },
  {
    key: "totalDigitalFiles",
    title: "Tổng file PDF",
    icon: Archive,
  },
  {
    key: "totalFonds",
    title: "Tổng phông",
    icon: Layers,
  },
  {
    key: "totalCatalogs",
    title: "Tổng mục lục",
    icon: Building2,
  },
  {
    key: "totalWarehouses",
    title: "Tổng kho",
    icon: Warehouse,
  },
  {
    key: "totalStorageBoxes",
    title: "Tổng hộp/cặp",
    icon: Boxes,
  },
  {
    key: "totalOcrCompleted",
    title: "OCR hoàn thành",
    icon: ScanText,
  },
] as const;

export function ReportStatCards({
  stats,
  isLoading,
}: ReportStatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        const value = stats[item.key];

        return (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatNumber(value)}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}