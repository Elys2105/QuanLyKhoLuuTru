export interface ProfileImportPayload {
  file: File;
  dry_run: boolean;
  sheet_name?: string;
  client_rows_json?: string;
}

export interface ImportRowError {
  sheet?: string;
  row?: number;
  row_number?: number;
  field?: string;
  column?: string;
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[] | string>;
}

export interface ImportRowWarning {
  sheet?: string;
  row?: number;
  row_number?: number;
  field?: string;
  message?: string;
  warning?: string;
}

export interface ProfileImportSummary {
  total_rows?: number;
  total?: number;
  valid_rows?: number;
  valid?: number;
  invalid_rows?: number;
  invalid?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  error_count?: number;
  warning_count?: number;
}

export interface ProfileImportResult {
  dry_run?: boolean;
  success?: boolean;
  message?: string;
  summary?: ProfileImportSummary;
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: ImportRowError[];
  warnings?: ImportRowWarning[];
  rows?: unknown[];
}

export interface ImportDisplayStats {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  created: number;
  updated: number;
  skipped: number;
  errorCount: number;
  warningCount: number;
}

export interface ClientExcelRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ClientExcelParsedRow {
  sheetName: string;
  rowNumber: number;
  boxNumber: string;
  profileCode: string;
  profileTitle: string;
  dateRange: string;
  totalPages: string;
  documentCount: string;
  retentionPeriod: string;
  notes: string;
}

export interface ClientExcelPreviewCell {
  key: string;
  value: string;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
  isTitle: boolean;
  isHeader: boolean;
  isNumberRow: boolean;
}

export interface ClientExcelPreviewRow {
  rowNumber: number;
  cells: ClientExcelPreviewCell[];
}

export interface ClientExcelSheetCheck {
  sheetName: string;
  previewRows: ClientExcelPreviewRow[];
  parsedRows: ClientExcelParsedRow[];
  errors: ImportRowError[];
  warnings: ImportRowWarning[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ClientExcelCheckResult {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: ClientExcelRow[];
  parsedRows: ClientExcelParsedRow[];
  sheets: ClientExcelSheetCheck[];
  errors: ImportRowError[];
  warnings: ImportRowWarning[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}