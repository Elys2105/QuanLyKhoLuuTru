import type { HasPdfFilter, ID, YearFilter } from "@/types/common";
import type { ListQueryParams, PaginationMeta } from "@/types/pagination";

export interface SearchDocumentMatch {
  id: ID;
  document_code?: string;
  title?: string;
  document_title?: string;
  summary?: string;
  document_date?: string | null;
  author?: string;
  page_start?: number | null;
  page_end?: number | null;
  start_page?: number | null;
  end_page?: number | null;
}

export interface SearchDigitalFile {
  id: ID;
  document_id?: ID | null;
  original_name: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  page_count?: number | null;
  is_primary?: boolean;
  preview_url?: string;
  download_url?: string;
  pdf_preview_url?: string;
  pdf_download_url?: string;
}

export interface SearchProfileResult {
  id: ID;

  profile_code: string;
  title: string;
  description?: string;
  year?: number | null;
  total_pages?: number | null;
  retention_period?: string | null;
  retention_period_display?: string;
  language?: string;
  note?: string;
  notes?: string;

  fond?: ID;
  fond_id?: ID;
  fond_code?: string;
  fond_name?: string;

  catalog?: ID;
  catalog_id?: ID;
  catalog_code?: string;
  catalog_name?: string;

  warehouse?: ID;
  warehouse_id?: ID;
  warehouse_code?: string;
  warehouse_name?: string;

  location?: ID;
  location_id?: ID;
  location_code?: string;
  location_name?: string;

  box?: ID;
  box_id?: ID;
  box_number?: string;
  box_title?: string;

  storage_file?: ID;
  storage_file_id?: ID;
  file_number?: string;
  storage_file_number?: string;
  storage_file_title?: string;

  document_matches?: SearchDocumentMatch[];
  matched_documents?: SearchDocumentMatch[];
  documents?: SearchDocumentMatch[];

  digital_files?: SearchDigitalFile[];

  document_count?: number;
  digital_file_count?: number;
  has_pdf?: boolean;

  pdf_preview_url?: string | null;
  pdf_download_url?: string | null;

  match_type?: string[];

  created_at?: string;
  updated_at?: string;
}

export interface SearchProfileParams
  extends ListQueryParams,
    YearFilter,
    HasPdfFilter {
  profile_code?: string;
  title?: string;
  document_code?: string;
  document_title?: string;
  fond?: ID | string;
  catalog?: ID | string;
  warehouse?: ID | string;
  location?: ID | string;
  box?: ID | string;
  box_number?: string;
  storage_file?: ID | string;
  file_number?: string;
  retention_period?: string;
}

export interface SearchProfilesResult {
  results: SearchProfileResult[];
  pagination: PaginationMeta;
}

export interface SearchFormValues {
  q: string;
  profile_code: string;
  title: string;
  document_code: string;
  document_title: string;
  year: string;
  box_number: string;
  file_number: string;
  has_pdf: string;
}