import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";

interface DashboardSummaryCardProps {
  title: string;
  value: number;
  description?: string;
  icon: LucideIcon;
}

export function DashboardSummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: DashboardSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold">
          {formatNumber(value)}
        </div>

        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}