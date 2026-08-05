"use client";

import type { ReportBucket } from "@/features/reports/types";
import {
  formatNumber,
  getBucketCount,
  getBucketLabel,
  normalizeBuckets,
} from "@/features/reports/utils/report-utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReportBucketTableProps {
  title: string;
  description?: string;
  buckets?: ReportBucket[] | null;
}

export function ReportBucketTable({
  title,
  description,
  buckets,
}: ReportBucketTableProps) {
  const rows = normalizeBuckets(buckets);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu thống kê.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nhóm</th>
                  <th className="px-3 py-2 text-right font-medium">Số lượng</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((bucket, index) => (
                  <tr key={`${getBucketLabel(bucket)}-${index}`} className="border-t">
                    <td className="px-3 py-2">
                      {getBucketLabel(bucket)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(getBucketCount(bucket))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}