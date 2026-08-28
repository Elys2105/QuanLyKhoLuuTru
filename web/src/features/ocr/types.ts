import type { ID } from "@/types/common";

export type OcrJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "SUCCESS"
  | "FAILED"
  | "pending"
  | "running"
  | "completed"
  | "success"
  | "failed"
  | string;

export interface OcrJob {
  id: ID;
  digital_file?: ID;
  digital_file_id?: ID;
  digital_file_name?: string;
  profile?: ID | null;
  profile_code?: string | null;
  profile_title?: string | null;
  document?: ID | null;
  document_code?: string | null;
  document_title?: string | null;
  status?: OcrJobStatus;
  ocr_mode?: string;
  current_page?: number;
  progress_percent?: number;
  page_count?: number;
  character_count?: number;
  engine?: string;
  language?: string;
  message?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface OcrRunResult {
  job?: OcrJob;
  fast_job?: OcrJob;
  quality_job?: OcrJob;
  jobs?: OcrJob[];
  id?: ID;
  digital_file?: ID;
  digital_file_id?: ID;
  status?: OcrJobStatus;
  message?: string;
  error_message?: string;
  progress_url?: string;
  best_text_url?: string;
}

export interface OcrTextResult extends OcrJob {
  text?: string;
  ocr_text?: string;
  content?: string;
  extracted_text?: string;
}

export interface OcrSearchResultItem {
  id?: ID;

  digital_file?: ID;
  digital_file_id?: ID;
  digital_file_name?: string;
  original_name?: string;

  profile?: ID;
  profile_id?: ID;
  profile_code?: string;
  profile_title?: string;

  document?: ID;
  document_id?: ID;
  document_code?: string;
  document_title?: string;

  snippet?: string;
  text?: string;
  content?: string;
  rank?: number;
}

export interface OcrSearchResult {
  query?: string;
  count?: number;
  total?: number;
  results?: OcrSearchResultItem[];
}

export interface OcrProfileSuggestion {
  profile_code: string;
  title: string;
  description?: string;
  year?: number | null;
  total_pages?: number | null;
  retention_period?: string | null;
  language?: string | null;
  notes?: string | null;
}

export interface OcrProfileSuggestionResult {
  digital_file_id: ID;
  digital_file_name?: string;
  ocr_job_id?: ID;
  ocr_status?: string;
  ocr_mode?: string;
  source_profile_id?: ID | null;
  source_document_id?: ID | null;
  suggestion: OcrProfileSuggestion;
  missing_required_fields?: string[];
  confidence?: number;
  warnings?: string[];
  preview_text?: string;
}
