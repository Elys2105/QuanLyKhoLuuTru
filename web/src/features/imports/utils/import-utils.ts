import * as XLSX from "xlsx";

import type {
  ClientExcelCheckResult,
  ClientExcelParsedRow,
  ClientExcelPreviewCell,
  ClientExcelPreviewRow,
  ClientExcelRow,
  ClientExcelSheetCheck,
  ImportDisplayStats,
  ImportRowError,
  ImportRowWarning,
  ProfileImportResult,
} from "@/features/imports/types";

type SheetMerge = {
  s: { r: number; c: number };
  e: { r: number; c: number };
};

export function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel")
  );
}

export function downloadBlobFile(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export function normalizeImportStats(
  result?: ProfileImportResult | null,
): ImportDisplayStats {
  const summary = result?.summary;

  const totalRows =
    summary?.total_rows ??
    summary?.total ??
    result?.total_rows ??
    0;

  const validRows =
    summary?.valid_rows ??
    summary?.valid ??
    result?.valid_rows ??
    Math.max(0, totalRows - (summary?.invalid_rows ?? result?.invalid_rows ?? 0));

  const invalidRows =
    summary?.invalid_rows ??
    summary?.invalid ??
    result?.invalid_rows ??
    0;

  const created = summary?.created ?? result?.created ?? 0;
  const updated = summary?.updated ?? result?.updated ?? 0;
  const skipped = summary?.skipped ?? result?.skipped ?? 0;

  const errorCount =
    summary?.error_count ??
    result?.errors?.length ??
    invalidRows;

  const warningCount =
    summary?.warning_count ??
    result?.warnings?.length ??
    0;

  return {
    totalRows,
    validRows,
    invalidRows,
    created,
    updated,
    skipped,
    errorCount,
    warningCount,
  };
}

export function getImportErrorSheet(error: ImportRowError): string {
  return error.sheet || "-";
}

export function getImportRowNumber(error: ImportRowError): string {
  return String(error.row_number ?? error.row ?? "-");
}

export function getImportErrorMessage(error: ImportRowError): string {
  if (error.message) return error.message;
  if (error.error) return error.error;

  if (Array.isArray(error.errors)) {
    return error.errors.join(", ");
  }

  if (error.errors && typeof error.errors === "object") {
    return Object.entries(error.errors)
      .map(([field, messages]) => {
        if (Array.isArray(messages)) {
          return `${field}: ${messages.join(", ")}`;
        }

        return `${field}: ${messages}`;
      })
      .join("; ");
  }

  return "Dữ liệu dòng này không hợp lệ.";
}

export function getImportErrorField(error: ImportRowError): string {
  return error.field || error.column || "-";
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCellText(sheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number): string {
  const address = XLSX.utils.encode_cell({
    r: rowIndex,
    c: columnIndex,
  });

  const cell = sheet[address];

  if (!cell) return "";

  return cellToText(cell.w ?? cell.v);
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findColumnIndex(
  headerRow: string[],
  aliases: string[],
): number {
  const normalizedAliases = aliases
    .map(normalizeText)
    .filter(Boolean);

  return headerRow.findIndex((header) => {
    const normalizedHeader = normalizeText(header);

    if (!normalizedHeader) return false;

    return normalizedAliases.some((alias) => {
      return (
        normalizedHeader === alias ||
        normalizedHeader.includes(alias)
      );
    });
  });
}

function rowContainsAlias(row: string[], aliases: string[]): boolean {
  return findColumnIndex(row, aliases) >= 0;
}

function findOfficialHeaderRowIndex(matrix: string[][]): number {
  for (let index = 0; index < matrix.length; index += 1) {
    const row = matrix[index];

    const hasBoxColumn = rowContainsAlias(row, [
      "hop/cap",
      "hop cap",
      "hop/cap so",
      "hop cap so",
      "hộp/cặp",
      "hộp/cặp số",
    ]);

    const hasProfileCodeColumn = rowContainsAlias(row, [
      "so, ky hieu ho",
      "số, ký hiệu hồ",
      "so, ky hieu ho so",
      "số, ký hiệu hồ sơ",
      "ma ho so",
      "mã hồ sơ",
    ]);

    const hasProfileTitleColumn = rowContainsAlias(row, [
      "ten ho so",
      "tên hồ sơ",
      "ten ho so (dvbq)",
      "tên hồ sơ (đvbq)",
    ]);

    if (hasBoxColumn && hasProfileCodeColumn && hasProfileTitleColumn) {
      return index;
    }
  }

  return -1;
}

function shouldStopAtFooterRow(row: string[]): boolean {
  const rowText = normalizeText(row.join(" "));

  const footerKeywords = [
    "muc luc nay gom",
    "viet bang chu",
    "trong do co",
    "nguoi lap",
    "ky va ghi ro",
  ];

  return footerKeywords.some((keyword) => rowText.includes(keyword));
}

function isNumberGuideRow(row: string[]): boolean {
  const values = row.map((cell) => cellToText(cell)).filter(Boolean);

  if (values.length < 3) return false;

  return (
    values.includes("1") &&
    values.includes("2") &&
    values.includes("3")
  );
}

function looksLikeColumnNumberRow(parsedRow: ClientExcelParsedRow): boolean {
  return (
    parsedRow.boxNumber === "1" &&
    parsedRow.profileCode === "2" &&
    parsedRow.profileTitle === "3"
  );
}

function looksLikeRepeatedHeaderRow(parsedRow: ClientExcelParsedRow): boolean {
  const profileCode = normalizeText(parsedRow.profileCode);
  const profileTitle = normalizeText(parsedRow.profileTitle);

  return (
    profileCode.includes("so, ky hieu") ||
    profileCode.includes("so ky hieu") ||
    profileTitle.includes("ten ho so")
  );
}

function hasUsefulImportData(parsedRow: ClientExcelParsedRow): boolean {
  return Boolean(
    parsedRow.profileCode ||
      parsedRow.profileTitle ||
      parsedRow.dateRange ||
      parsedRow.totalPages ||
      parsedRow.documentCount ||
      parsedRow.retentionPeriod ||
      parsedRow.notes,
  );
}

function makePreviewRow(parsedRow: ClientExcelParsedRow): ClientExcelRow {
  return {
    rowNumber: parsedRow.rowNumber,
    values: {
      Sheet: parsedRow.sheetName,
      "Hộp/Cặp số": parsedRow.boxNumber,
      "Số, ký hiệu hồ sơ": parsedRow.profileCode,
      "Tên hồ sơ": parsedRow.profileTitle,
      "Thời gian bắt đầu, kết thúc": parsedRow.dateRange,
      "Số trang": parsedRow.totalPages,
      "Số tài liệu": parsedRow.documentCount,
      "Thời hạn bảo quản": parsedRow.retentionPeriod,
      "Ghi chú": parsedRow.notes,
    },
  };
}

function getMergeStart(
  merges: SheetMerge[],
  rowIndex: number,
  columnIndex: number,
): SheetMerge | null {
  return (
    merges.find(
      (merge) =>
        merge.s.r === rowIndex &&
        merge.s.c === columnIndex,
    ) ?? null
  );
}

function isInsideMergeButNotStart(
  merges: SheetMerge[],
  rowIndex: number,
  columnIndex: number,
): boolean {
  return merges.some(
    (merge) =>
      rowIndex >= merge.s.r &&
      rowIndex <= merge.e.r &&
      columnIndex >= merge.s.c &&
      columnIndex <= merge.e.c &&
      !(merge.s.r === rowIndex && merge.s.c === columnIndex),
  );
}

function buildExcelPreviewRows(
  sheet: XLSX.WorkSheet,
  headerRowIndex: number,
): ClientExcelPreviewRow[] {
  if (!sheet["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const merges = ((sheet["!merges"] ?? []) as SheetMerge[]);

  const rows: ClientExcelPreviewRow[] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const cells: ClientExcelPreviewCell[] = [];

    for (
      let columnIndex = range.s.c;
      columnIndex <= range.e.c;
      columnIndex += 1
    ) {
      const hidden = isInsideMergeButNotStart(merges, rowIndex, columnIndex);

      if (hidden) {
        continue;
      }

      const merge = getMergeStart(merges, rowIndex, columnIndex);
      const value = getCellText(sheet, rowIndex, columnIndex);

      cells.push({
        key: `${rowIndex}-${columnIndex}`,
        value,
        rowSpan: merge ? merge.e.r - merge.s.r + 1 : 1,
        colSpan: merge ? merge.e.c - merge.s.c + 1 : 1,
        hidden: false,
        isTitle: headerRowIndex >= 0 && rowIndex < headerRowIndex,
        isHeader: rowIndex === headerRowIndex,
        isNumberRow: rowIndex === headerRowIndex + 1,
      });
    }

    const hasAnyValue = cells.some((cell) => cell.value);

    if (hasAnyValue) {
      rows.push({
        rowNumber: rowIndex + 1,
        cells,
      });
    }
  }

  return rows;
}

function makeMatrixFromSheet(sheet: XLSX.WorkSheet): string[][] {
  if (!sheet["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const matrix: string[][] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row: string[] = [];

    for (
      let columnIndex = range.s.c;
      columnIndex <= range.e.c;
      columnIndex += 1
    ) {
      row.push(getCellText(sheet, rowIndex, columnIndex));
    }

    matrix.push(row);
  }

  return matrix;
}

function parseSheet(
  workbookSheetName: string,
  sheet: XLSX.WorkSheet,
): ClientExcelSheetCheck {
  const matrix = makeMatrixFromSheet(sheet);
  const headerRowIndex = findOfficialHeaderRowIndex(matrix);

  const errors: ImportRowError[] = [];
  const warnings: ImportRowWarning[] = [];
  const parsedRows: ClientExcelParsedRow[] = [];

  const previewRows = buildExcelPreviewRows(sheet, headerRowIndex);

  if (headerRowIndex < 0) {
    warnings.push({
      sheet: workbookSheetName,
      row: 1,
      field: "header",
      message: "Không tìm thấy dòng tiêu đề bảng mục lục hồ sơ trong sheet này.",
    });

    return {
      sheetName: workbookSheetName,
      previewRows,
      parsedRows,
      errors,
      warnings,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }

  const headerRow = matrix[headerRowIndex];

  const boxColumnIndex = findColumnIndex(headerRow, [
    "hop/cap",
    "hop cap",
    "hop/cap so",
    "hop cap so",
    "hộp/cặp",
    "hộp/cặp số",
  ]);

  const profileCodeColumnIndex = findColumnIndex(headerRow, [
    "so, ky hieu ho",
    "số, ký hiệu hồ",
    "so, ky hieu ho so",
    "số, ký hiệu hồ sơ",
    "ma ho so",
    "mã hồ sơ",
  ]);

  const profileTitleColumnIndex = findColumnIndex(headerRow, [
    "ten ho so",
    "tên hồ sơ",
    "ten ho so (dvbq)",
    "tên hồ sơ (đvbq)",
  ]);

  const dateRangeColumnIndex = findColumnIndex(headerRow, [
    "thoi gian bat dau",
    "thời gian bắt đầu",
    "thoi gian bat dau, ket thuc",
    "thời gian bắt đầu, kết thúc",
    "thoi gian",
    "thời gian",
  ]);

  const totalPagesColumnIndex = findColumnIndex(headerRow, [
    "so trang",
    "số trang",
  ]);

  const documentCountColumnIndex = findColumnIndex(headerRow, [
    "so tai lieu",
    "số tài liệu",
  ]);

  const retentionPeriodColumnIndex = findColumnIndex(headerRow, [
    "thoi han",
    "thời hạn",
    "thoi han bao quan",
    "thời hạn bảo quản",
  ]);

  const notesColumnIndex = findColumnIndex(headerRow, [
    "ghi",
    "ghi chu",
    "ghi chú",
  ]);

  let dataStartRowIndex = headerRowIndex + 1;

  if (isNumberGuideRow(matrix[headerRowIndex + 1] ?? [])) {
    dataStartRowIndex = headerRowIndex + 2;
  }

  for (
    let rowIndex = dataStartRowIndex;
    rowIndex < matrix.length;
    rowIndex += 1
  ) {
    const row = matrix[rowIndex];

    if (shouldStopAtFooterRow(row)) {
      break;
    }

    const parsedRow: ClientExcelParsedRow = {
      sheetName: workbookSheetName,
      rowNumber: rowIndex + 1,
      boxNumber:
        boxColumnIndex >= 0 ? cellToText(row[boxColumnIndex]) : "",
      profileCode:
        profileCodeColumnIndex >= 0
          ? cellToText(row[profileCodeColumnIndex])
          : "",
      profileTitle:
        profileTitleColumnIndex >= 0
          ? cellToText(row[profileTitleColumnIndex])
          : "",
      dateRange:
        dateRangeColumnIndex >= 0
          ? cellToText(row[dateRangeColumnIndex])
          : "",
      totalPages:
        totalPagesColumnIndex >= 0
          ? cellToText(row[totalPagesColumnIndex])
          : "",
      documentCount:
        documentCountColumnIndex >= 0
          ? cellToText(row[documentCountColumnIndex])
          : "",
      retentionPeriod:
        retentionPeriodColumnIndex >= 0
          ? cellToText(row[retentionPeriodColumnIndex])
          : "",
      notes:
        notesColumnIndex >= 0
          ? cellToText(row[notesColumnIndex])
          : "",
    };

    if (looksLikeColumnNumberRow(parsedRow)) {
      continue;
    }

    if (looksLikeRepeatedHeaderRow(parsedRow)) {
      continue;
    }

    if (!hasUsefulImportData(parsedRow)) {
      continue;
    }

    parsedRows.push(parsedRow);

    if (!parsedRow.profileCode) {
      errors.push({
        sheet: workbookSheetName,
        row: parsedRow.rowNumber,
        field: "Số, ký hiệu hồ sơ",
        message: "Thiếu số/ký hiệu hồ sơ.",
      });
    }

    if (!parsedRow.profileTitle) {
      errors.push({
        sheet: workbookSheetName,
        row: parsedRow.rowNumber,
        field: "Tên hồ sơ",
        message: "Thiếu tên hồ sơ.",
      });
    }
  }

  const errorRowKeys = new Set(
    errors
      .filter((error) => error.row || error.row_number)
      .map((error) => `${error.sheet || "-"}:${error.row_number ?? error.row}`),
  );

  const totalRows = parsedRows.length;
  const invalidRows = Math.min(totalRows, errorRowKeys.size);
  const validRows = Math.max(0, totalRows - invalidRows);

  return {
    sheetName: workbookSheetName,
    previewRows,
    parsedRows,
    errors,
    warnings,
    totalRows,
    validRows,
    invalidRows,
  };
}

export async function checkExcelFileInBrowser(
  file: File,
): Promise<ClientExcelCheckResult> {
  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: false,
  });

  const sheets: ClientExcelSheetCheck[] = workbook.SheetNames.map((sheetName) =>
    parseSheet(sheetName, workbook.Sheets[sheetName]),
  );

  const parsedRows = sheets.flatMap((sheet) => sheet.parsedRows);
  const errors = sheets.flatMap((sheet) => sheet.errors);
  const warnings = sheets.flatMap((sheet) => sheet.warnings);

  if (workbook.SheetNames.length === 0) {
    errors.push({
      row: 1,
      field: "sheet",
      message: "File Excel không có sheet dữ liệu.",
    });
  }

  if (parsedRows.length === 0 && errors.length === 0) {
    errors.push({
      row: 1,
      field: "data",
      message:
        "Không tìm thấy dòng hồ sơ nào trong file Excel. Kiểm tra lại định dạng file.",
    });
  }

  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.totalRows, 0);
  const invalidRows = sheets.reduce((sum, sheet) => sum + sheet.invalidRows, 0);
  const validRows = Math.max(0, totalRows - invalidRows);

  const headers = [
    "Sheet",
    "Hộp/Cặp số",
    "Số, ký hiệu hồ sơ",
    "Tên hồ sơ",
    "Thời gian bắt đầu, kết thúc",
    "Số trang",
    "Số tài liệu",
    "Thời hạn bảo quản",
    "Ghi chú",
  ];

  const rows = parsedRows.map(makePreviewRow);

  return {
    fileName: file.name,
    sheetName: workbook.SheetNames.join(", "),
    headers,
    rows,
    parsedRows,
    sheets,
    errors,
    warnings,
    totalRows,
    validRows,
    invalidRows,
  };
}