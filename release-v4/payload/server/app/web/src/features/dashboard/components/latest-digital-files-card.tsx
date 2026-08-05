import type { DashboardLatestDigitalFile } from "@/features/dashboard/types";
import {
  formatDateTime,
  formatFileSize,
} from "@/lib/utils/format";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LatestDigitalFilesCardProps {
  digitalFiles: DashboardLatestDigitalFile[];
}

export function LatestDigitalFilesCard({
  digitalFiles,
}: LatestDigitalFilesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          PDF mới nhất
        </CardTitle>
      </CardHeader>

      <CardContent>
        {digitalFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có file PDF mới.
          </p>
        ) : (
          <div className="space-y-3">
            {digitalFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-md border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-medium">
                      {file.original_name || file.file_name || "File PDF"}
                    </div>

                    <div className="truncate text-xs text-muted-foreground">
                      Hồ sơ: {file.profile_code || "-"}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(file.created_at)}
                    </div>
                  </div>

                  <Badge variant="secondary">
                    {formatFileSize(file.file_size)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}