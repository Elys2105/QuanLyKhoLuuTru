"use client";

import {
  Archive,
  Boxes,
  Building2,
  Database,
  FileArchive,
  FileText,
  FolderKanban,
  MapPinned,
  RefreshCw,
} from "lucide-react";

import { DashboardSummaryCard } from "@/features/dashboard/components/dashboard-summary-card";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { LatestDigitalFilesCard } from "@/features/dashboard/components/latest-digital-files-card";
import { LatestProfilesCard } from "@/features/dashboard/components/latest-profiles-card";
import {
  getLatestDigitalFiles,
  getLatestProfiles,
  getSummaryValue,
} from "@/features/dashboard/components/dashboard-utils";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const summary = data?.summary;

  const summaryCards = [
    {
      title: "Phông lưu trữ",
      value: getSummaryValue(summary, ["fonds", "total_fonds"]),
      description: "Tổng số phông/đơn vị lưu trữ",
      icon: Archive,
    },
    {
      title: "Mục lục",
      value: getSummaryValue(summary, ["catalogs", "total_catalogs"]),
      description: "Tổng mục lục hồ sơ",
      icon: FolderKanban,
    },
    {
      title: "Kho",
      value: getSummaryValue(summary, ["warehouses", "total_warehouses"]),
      description: "Tổng kho lưu trữ",
      icon: Building2,
    },
    {
      title: "Vị trí",
      value: getSummaryValue(summary, ["locations", "total_locations"]),
      description: "Kệ, phòng hoặc vị trí lưu trữ",
      icon: MapPinned,
    },
    {
      title: "Hộp/Cặp",
      value: getSummaryValue(summary, ["boxes", "total_boxes"]),
      description: "Tổng hộp/cặp lưu trữ",
      icon: Boxes,
    },
    {
      title: "Tệp",
      value: getSummaryValue(summary, ["storage_files", "total_storage_files"]),
      description: "Tổng tệp trong hộp/cặp",
      icon: Database,
    },
    {
      title: "Hồ sơ",
      value: getSummaryValue(summary, ["profiles", "total_profiles"]),
      description: "Tổng hồ sơ lưu trữ",
      icon: FileArchive,
    },
    {
      title: "Tài liệu/PDF",
      value:
        getSummaryValue(summary, ["documents", "total_documents"]) +
        getSummaryValue(summary, ["digital_files", "total_digital_files"]),
      description: "Tổng tài liệu và file số hóa",
      icon: FileText,
    },
  ];

  const latestProfiles = getLatestProfiles(data);
  const latestDigitalFiles = getLatestDigitalFiles(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Tổng quan dữ liệu hệ thống lưu trữ từ API thật.
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
              "Không tải được dữ liệu dashboard.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <DashboardSummaryCard
            key={card.title}
            title={card.title}
            value={card.value}
            description={card.description}
            icon={card.icon}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LatestProfilesCard profiles={latestProfiles} />
        <LatestDigitalFilesCard digitalFiles={latestDigitalFiles} />
      </div>
    </div>
  );
}