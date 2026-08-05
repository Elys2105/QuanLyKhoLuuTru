import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type {
  DashboardReportRaw,
  ExportFormat,
  ReportFilters,
} from "@/features/reports/types";

function unwrapData<T>(payload: T | ApiResponse<T>): T {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload
  ) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
}

function buildReportParams(filters: ReportFilters) {
  return cleanQueryParams({
    q: filters.q,
    fond: filters.fond,
    catalog: filters.catalog,
    warehouse: filters.warehouse,
    year: filters.year,
    retention_period: filters.retention_period,
    has_pdf: filters.has_pdf,
  });
}

function getFileNameFromContentDisposition(
  contentDisposition?: string,
): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

  if (normalMatch?.[1]) {
    return normalMatch[1];
  }

  return null;
}

function makeDefaultExportFileName(format: ExportFormat): string {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");

  return format === "excel"
    ? `bao-cao-ho-so-${timestamp}.xlsx`
    : `bao-cao-ho-so-${timestamp}.pdf`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export async function getDashboardReportApi(): Promise<DashboardReportRaw> {
  const response = await apiClient.get<
    DashboardReportRaw | ApiResponse<DashboardReportRaw>
  >(API_ENDPOINTS.dashboard.summary);

  return unwrapData<DashboardReportRaw>(response.data);
}

export async function exportProfilesReportApi(
  format: ExportFormat,
  filters: ReportFilters,
): Promise<string> {
  const endpoint =
    format === "excel"
      ? API_ENDPOINTS.exports.profilesExcel
      : API_ENDPOINTS.exports.profilesPdf;

  const response = await apiClient.get<Blob>(endpoint, {
    params: buildReportParams(filters),
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"];
  const fileName =
    getFileNameFromContentDisposition(contentDisposition) ??
    makeDefaultExportFileName(format);

  downloadBlob(response.data, fileName);

  return fileName;
}