import type { ProfileImportResult } from "@/features/imports/types";
import {
  getImportErrorField,
  getImportErrorMessage,
  getImportRowNumber,
  normalizeImportStats,
} from "@/features/imports/utils/import-utils";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProfileImportResultCardProps {
  result: ProfileImportResult | null;
}

export function ProfileImportResultCard({
  result,
}: ProfileImportResultCardProps) {
  if (!result) {
    return null;
  }

  const stats = normalizeImportStats(result);
  const errors = result.errors ?? [];
  const warnings = result.warnings ?? [];

  const isDryRun = Boolean(result.dry_run);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isDryRun ? "Kết quả kiểm tra Excel" : "Kết quả import Excel"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isDryRun
            ? "Dry-run chỉ kiểm tra dữ liệu, chưa ghi vào database."
            : "Import thật đã ghi dữ liệu hợp lệ vào database."}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {result.message ? (
          <Alert>
            <AlertDescription>
              {result.message}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">Tổng dòng</div>
            <div className="mt-1 text-2xl font-bold">
              {stats.totalRows}
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">Dòng hợp lệ</div>
            <div className="mt-1 text-2xl font-bold">
              {stats.validRows}
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">Dòng lỗi</div>
            <div className="mt-1 text-2xl font-bold">
              {stats.invalidRows}
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">Cảnh báo</div>
            <div className="mt-1 text-2xl font-bold">
              {stats.warningCount}
            </div>
          </div>
        </div>

        {!isDryRun ? (
          <div className="flex flex-wrap gap-2">
            <Badge>Thêm mới: {stats.created}</Badge>
            <Badge variant="secondary">Cập nhật: {stats.updated}</Badge>
            <Badge variant="outline">Bỏ qua: {stats.skipped}</Badge>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-medium text-destructive">
              Lỗi cần sửa trong file Excel
            </h3>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Dòng</th>
                    <th className="px-3 py-2 text-left font-medium">Cột/Field</th>
                    <th className="px-3 py-2 text-left font-medium">Nội dung lỗi</th>
                  </tr>
                </thead>

                <tbody>
                  {errors.map((error, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2">
                        {getImportRowNumber(error)}
                      </td>
                      <td className="px-3 py-2">
                        {getImportErrorField(error)}
                      </td>
                      <td className="px-3 py-2">
                        {getImportErrorMessage(error)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              Không phát hiện lỗi dòng dữ liệu.
            </AlertDescription>
          </Alert>
        )}

        {warnings.length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-medium">Cảnh báo</h3>

            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="rounded-md border bg-muted/30 p-3 text-sm"
                >
                  Dòng {warning.row_number ?? warning.row ?? "-"}:{" "}
                  {warning.message ?? warning.warning ?? "Có cảnh báo dữ liệu."}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}