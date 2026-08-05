import type {
  OcrRunResult,
  OcrSearchResult,
  OcrSearchResultItem,
  OcrTextResult,
} from "@/features/ocr/types";

export function getOcrText(result?: OcrTextResult | null): string {
  if (!result) return "";

  return (
    result.text ||
    result.ocr_text ||
    result.content ||
    result.extracted_text ||
    ""
  );
}

export function getOcrStatus(
  result?: OcrTextResult | OcrRunResult | null,
): string {
  if (!result) return "-";

  if ("job" in result && result.job?.status) {
    return result.job.status;
  }

  return result.status || "-";
}

export function getOcrMessage(
  result?: OcrTextResult | OcrRunResult | null,
): string {
  if (!result) return "";

  if ("job" in result && result.job?.message) {
    return result.job.message;
  }

  return result.message || result.error_message || "";
}

export function normalizeOcrSearchResults(
  result?: OcrSearchResult | null,
): OcrSearchResultItem[] {
  return result?.results ?? [];
}

export function getOcrSearchSnippet(item: OcrSearchResultItem): string {
  return item.snippet || item.text || item.content || "";
}

export function getOcrFileName(item: OcrSearchResultItem): string {
  return item.digital_file_name || item.original_name || "File OCR";
}