import type {
  DashboardReportRaw,
  DashboardReportStats,
  ReportBucket,
} from "@/features/reports/types";

function getNumberFromObject(
  source: Record<string, unknown> | null | undefined,
  keys: string[],
): number {
  if (!source) return 0;

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getNumber(
  raw: DashboardReportRaw | null | undefined,
  keys: string[],
): number {
  const directValue = getNumberFromObject(raw, keys);

  if (directValue > 0) return directValue;

  return getNumberFromObject(raw?.summary, keys);
}

export function normalizeDashboardStats(
  raw?: DashboardReportRaw | null,
): DashboardReportStats {
  return {
    totalProfiles: getNumber(raw, [
      "total_profiles",
      "profiles_count",
      "profile_count",
    ]),
    totalDocuments: getNumber(raw, [
      "total_documents",
      "documents_count",
      "document_count",
    ]),
    totalDigitalFiles: getNumber(raw, [
      "total_digital_files",
      "digital_files_count",
      "digital_file_count",
      "total_pdfs",
      "pdf_count",
    ]),
    totalFonds: getNumber(raw, [
      "total_fonds",
      "fonds_count",
      "fond_count",
    ]),
    totalCatalogs: getNumber(raw, [
      "total_catalogs",
      "catalogs_count",
      "catalog_count",
    ]),
    totalWarehouses: getNumber(raw, [
      "total_warehouses",
      "warehouses_count",
      "warehouse_count",
    ]),
    totalStorageBoxes: getNumber(raw, [
      "total_boxes",
      "total_storage_boxes",
      "storage_boxes_count",
      "box_count",
    ]),
    totalStorageFiles: getNumber(raw, [
      "total_storage_files",
      "storage_files_count",
      "storage_file_count",
    ]),
    totalOcrCompleted: getNumber(raw, [
      "total_ocr_completed",
      "ocr_completed_count",
      "completed_ocr_count",
    ]),
    totalOcrFailed: getNumber(raw, [
      "total_ocr_failed",
      "ocr_failed_count",
      "failed_ocr_count",
    ]),
  };
}

export function getBucketLabel(bucket: ReportBucket): string {
  if (bucket.fond_code || bucket.fond_name) {
    return [bucket.fond_code, bucket.fond_name].filter(Boolean).join(" - ");
  }

  if (bucket.warehouse_code || bucket.warehouse_name) {
    return [bucket.warehouse_code, bucket.warehouse_name].filter(Boolean).join(" - ");
  }

  return String(
    bucket.label ??
      bucket.name ??
      bucket.key ??
      bucket.year ??
      bucket.retention_period ??
      bucket.mime_type ??
      "-"
  );
}

export function getBucketCount(bucket: ReportBucket): number {
  return Number(bucket.count ?? bucket.total ?? bucket.value ?? 0);
}

export function normalizeBuckets(
  buckets?: ReportBucket[] | null,
): ReportBucket[] {
  return Array.isArray(buckets) ? buckets : [];
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}