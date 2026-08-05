import type {
  ClientExcelCheckResult,
  ClientExcelParsedRow,
  ClientExcelPreviewCell,
  ClientExcelSheetCheck,
} from "@/features/imports/types";
import {
  getImportErrorField,
  getImportErrorMessage,
  getImportErrorSheet,
  getImportRowNumber,
} from "@/features/imports/utils/import-utils";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClientExcelCheckCardProps {
  result: ClientExcelCheckResult | null;
}

function getCellClassName(cell: ClientExcelPreviewCell): string {
  const base =
    "min-w-[90px] whitespace-pre-wrap border border-neutral-300 px-2 py-1 text-center align-middle";

  if (cell.isTitle) {
    return `${base} bg-white text-base font-bold`;
  }

  if (cell.isHeader) {
    return `${base} bg-white font-bold`;
  }

  if (cell.isNumberRow) {
    return `${base} bg-white font-bold`;
  }

  return `${base} bg-white`;
}

function renderExcelLikePreview(sheet: ClientExcelSheetCheck) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <table className="border-collapse text-sm">
        <tbody>
          {sheet.previewRows.map((row) => (
            <tr key={row.rowNumber}>
              {row.cells.map((cell) => (
                <td
                  key={cell.key}
                  rowSpan={cell.rowSpan}
                  colSpan={cell.colSpan}
                  className={getCellClassName(cell)}
                >
                  {cell.value || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderParsedRows(rows: ClientExcelParsedRow[]) {
  if (rows.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Không trích xuất được hồ sơ nào từ sheet này.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1200px] text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Dòng Excel</th>
            <th className="px-3 py-2 text-left font-medium">Hộp/Cặp</th>
            <th className="px-3 py-2 text-left font-medium">Số, ký hiệu hồ sơ</th>
            <th className="px-3 py-2 text-left font-medium">Tên hồ sơ</th>
            <th className="px-3 py-2 text-left font-medium">Thời gian</th>
            <th className="px-3 py-2 text-left font-medium">Số trang</th>
            <th className="px-3 py-2 text-left font-medium">Số tài liệu</th>
            <th className="px-3 py-2 text-left font-medium">Thời hạn bảo quản</th>
            <th className="px-3 py-2 text-left font-medium">Ghi chú</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.sheetName}-${row.rowNumber}-${row.profileCode}`}
              className="border-t"
            >
              <td className="px-3 py-2">{row.rowNumber}</td>
              <td className="px-3 py-2">{row.boxNumber || "-"}</td>
              <td className="px-3 py-2">{row.profileCode || "-"}</td>
              <td className="px-3 py-2">{row.profileTitle || "-"}</td>
              <td className="px-3 py-2">{row.dateRange || "-"}</td>
              <td className="px-3 py-2">{row.totalPages || "-"}</td>
              <td className="px-3 py-2">{row.documentCount || "-"}</td>
              <td className="px-3 py-2">{row.retentionPeriod || "-"}</td>
              <td className="px-3 py-2">{row.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientExcelCheckCard({
  result,
}: ClientExcelCheckCardProps) {
  if (!result) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kết quả kiểm tra trên web</CardTitle>
        <p className="text-sm text-muted-foreground">
          File được đọc trực tiếp trên trình duyệt. Mỗi sheet được hiển thị thành một block riêng theo bố cục Excel.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">File: {result.fileName}</Badge>
          <Badge variant="outline">Số sheet: {result.sheets.length}</Badge>
          <Badge>Tổng hồ sơ đọc được: {result.totalRows}</Badge>
          <Badge variant="secondary">Hợp lệ: {result.validRows}</Badge>
          <Badge variant={result.invalidRows > 0 ? "destructive" : "outline"}>
            Lỗi: {result.invalidRows}
          </Badge>
        </div>

        {result.errors.length === 0 ? (
          <Alert>
            <AlertDescription>
              File Excel hợp lệ ở bước kiểm tra trên web. Bạn có thể bấm Import thật.
            </AlertDescription>
          </Alert>
        ) : null}

        {result.sheets.map((sheet) => (
          <div key={sheet.sheetName} className="rounded-lg border">
            <div className="border-b bg-muted/30 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    Sheet: {sheet.sheetName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Hiển thị bố cục Excel và dữ liệu hồ sơ trích xuất từ sheet này.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge>Tổng: {sheet.totalRows}</Badge>
                  <Badge variant="secondary">Hợp lệ: {sheet.validRows}</Badge>
                  <Badge variant={sheet.invalidRows > 0 ? "destructive" : "outline"}>
                    Lỗi: {sheet.invalidRows}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-4">
              {sheet.warnings.length > 0 ? (
                <div className="space-y-2">
                  {sheet.warnings.map((warning, index) => (
                    <Alert key={index}>
                      <AlertDescription>
                        {warning.message || warning.warning || "Có cảnh báo."}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : null}

              {sheet.errors.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-destructive">
                    Lỗi trong sheet này
                  </h4>

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Sheet</th>
                          <th className="px-3 py-2 text-left font-medium">Dòng</th>
                          <th className="px-3 py-2 text-left font-medium">Cột</th>
                          <th className="px-3 py-2 text-left font-medium">Lỗi</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sheet.errors.map((error, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-3 py-2">
                              {getImportErrorSheet(error)}
                            </td>
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
              ) : null}

              <div className="space-y-3">
                <h4 className="font-medium">
                  Xem như Excel
                </h4>

                {renderExcelLikePreview(sheet)}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">
                  Hồ sơ trích xuất để import
                </h4>

                {renderParsedRows(sheet.parsedRows)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}