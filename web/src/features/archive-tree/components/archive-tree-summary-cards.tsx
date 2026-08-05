import {
  Boxes,
  Building2,
  Database,
  FileArchive,
  FileText,
  MapPinned,
} from "lucide-react";

import type { ArchiveTreeSummary } from "@/features/archive-tree/types";
import { getSummaryValue } from "@/features/archive-tree/utils/archive-tree-utils";
import { formatNumber } from "@/lib/utils/format";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ArchiveTreeSummaryCardsProps {
  summary?: ArchiveTreeSummary;
}

export function ArchiveTreeSummaryCards({
  summary,
}: ArchiveTreeSummaryCardsProps) {
  const cards = [
    {
      title: "Kho",
      value: getSummaryValue(summary, ["warehouses", "total_warehouses"]),
      icon: Building2,
    },
    {
      title: "Vị trí/Kệ",
      value: getSummaryValue(summary, ["locations", "total_locations"]),
      icon: MapPinned,
    },
    {
      title: "Hộp/Cặp",
      value: getSummaryValue(summary, ["boxes", "total_boxes"]),
      icon: Boxes,
    },
    {
      title: "Tệp",
      value: getSummaryValue(summary, ["storage_files", "total_storage_files"]),
      icon: Database,
    },
    {
      title: "Hồ sơ",
      value: getSummaryValue(summary, ["profiles", "total_profiles"]),
      icon: FileArchive,
    },
    {
      title: "PDF",
      value: getSummaryValue(summary, ["digital_files", "total_digital_files"]),
      icon: FileText,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(card.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}