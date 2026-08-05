import type { BaseEntity, ID } from "@/types/common";
import type { ListQueryParams, PaginationMeta } from "@/types/pagination";

export interface Document extends BaseEntity {
  profile: ID;
  profile_id?: ID;
  profile_code?: string;
  profile_title?: string;

  document_code: string;
  title: string;
  document_date?: string | null;
  author?: string;

  page_start?: number | null;
  page_end?: number | null;
  start_page?: number | null;
  end_page?: number | null;

  summary?: string;
  search_text?: string;
  notes?: string;
  note?: string;

  digital_file_count?: number;
  document_identifier?: string;
  order_in_profile?: number | null;
  document_number?: string;
  document_symbol?: string;
  document_type?: string;
  signer?: string;
  copy_type?: string;
  language?: string;
  security_level?: string;
  page_count?: number | null;
  page_number?: string;
  attachment_note?: string;
  digital_signature?: string;
  catalog_id?: number | null;
  catalog_code?: string;
  catalog_name?: string;
  fond_id?: number | null;
  fond_code?: string;
  fond_name?: string;
}

export interface DocumentPayload {
  profile: ID | string;
  document_code: string;
  title: string;
  document_date?: string | null;
  author?: string;
  page_start?: number | null;
  page_end?: number | null;
  summary?: string;
  search_text?: string;
  notes?: string;
  document_identifier?: string;
  order_in_profile?: number | null;
  document_number?: string;
  document_symbol?: string;
  document_type?: string;
  signer?: string;
  copy_type?: string;
  language?: string;
  security_level?: string;
  page_count?: number | null;
  page_number?: string;
  attachment_note?: string;
  digital_signature?: string;
}

export interface DocumentQueryParams extends ListQueryParams {
  profile?: ID | string;
  document_code?: string;
  title?: string;
  author?: string;
  year?: number | string;
}

export interface DocumentListResult {
  results: Document[];
  pagination: PaginationMeta;
}

export interface DocumentFormValues {
  profile: string;
  document_code: string;
  title: string;
  document_date: string;
  author: string;
  page_start: string;
  page_end: string;
  summary: string;
  notes: string;
  document_identifier: string;
  order_in_profile: string;
  document_number: string;
  document_symbol: string;
  document_type: string;
  signer: string;
  copy_type: string;
  language: string;
  security_level: string;
  page_count: string;
  page_number: string;
  attachment_note: string;
  digital_signature: string;
}
