export interface DashboardReportRaw {
  summary?: DashboardReportSummary;
  charts?: DashboardReportCharts;
  latest?: Record<string, unknown>;

  total_profiles?: number;
  profiles_count?: number;
  profile_count?: number;

  total_documents?: number;
  documents_count?: number;
  document_count?: number;

  total_digital_files?: number;
  digital_files_count?: number;
  digital_file_count?: number;
  total_pdfs?: number;
  pdf_count?: number;
  total_pdf_size?: number;

  total_fonds?: number;
  fonds_count?: number;
  fond_count?: number;

  total_catalogs?: number;
  catalogs_count?: number;
  catalog_count?: number;

  total_warehouses?: number;
  warehouses_count?: number;
  warehouse_count?: number;

  total_boxes?: number;
  total_storage_boxes?: number;
  storage_boxes_count?: number;
  box_count?: number;

  total_storage_files?: number;
  storage_files_count?: number;
  storage_file_count?: number;

  total_ocr_completed?: number;
  ocr_completed_count?: number;
  completed_ocr_count?: number;

  total_ocr_failed?: number;
  ocr_failed_count?: number;
  failed_ocr_count?: number;

  profiles_by_year?: ReportBucket[];
  profiles_by_retention_period?: ReportBucket[];
  files_by_mime_type?: ReportBucket[];

  [key: string]: unknown;
}

export interface DashboardReportSummary {
  total_fonds?: number;
  total_catalogs?: number;
  total_warehouses?: number;
  total_boxes?: number;
  total_storage_files?: number;
  total_profiles?: number;
  total_documents?: number;
  total_digital_files?: number;
  total_pdf_size?: number;
  [key: string]: unknown;
}

export interface DashboardReportCharts {
  profiles_by_year?: ReportBucket[];
  profiles_by_fond?: ReportBucket[];
  boxes_by_warehouse?: ReportBucket[];
  profiles_by_retention_period?: ReportBucket[];
  files_by_mime_type?: ReportBucket[];
  [key: string]: unknown;
}

export interface ReportBucket {
  label?: string;
  name?: string;
  key?: string;
  year?: string | number;
  fond_code?: string;
  fond_name?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  retention_period?: string;
  mime_type?: string;
  count?: number;
  total?: number;
  value?: number;
}

export interface DashboardReportStats {
  totalProfiles: number;
  totalDocuments: number;
  totalDigitalFiles: number;
  totalFonds: number;
  totalCatalogs: number;
  totalWarehouses: number;
  totalStorageBoxes: number;
  totalStorageFiles: number;
  totalOcrCompleted: number;
  totalOcrFailed: number;
}

export interface ReportFilters {
  q?: string;
  fond?: string;
  catalog?: string;
  warehouse?: string;
  year?: string;
  retention_period?: string;
  has_pdf?: string;
}

export type ExportFormat = "excel" | "pdf";

export interface ExportReportPayload {
  format: ExportFormat;
  filters: ReportFilters;
}