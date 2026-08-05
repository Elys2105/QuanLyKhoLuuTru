import type { BaseEntity, HasPdfFilter, ID, YearFilter } from "@/types/common";
import type { ListQueryParams, PaginationMeta } from "@/types/pagination";

export type RetentionPeriod =
  | "PERMANENT"
  | "LONG_TERM"
  | "TEMPORARY"
  | string;

export interface Profile extends BaseEntity {
  catalog?: ID;
  catalog_id?: ID;
  catalog_code?: string;
  catalog_name?: string;

  fond?: ID;
  fond_id?: ID;
  fond_code?: string;
  fond_name?: string;

  storage_file?: ID;
  storage_file_id?: ID;
  storage_file_number?: string;
  storage_file_title?: string;
  file_number?: string;

  storage_box?: ID;
  box?: ID;
  box_id?: ID;
  box_number?: string;
  box_title?: string;

  location?: ID;
  location_id?: ID;
  location_code?: string;
  location_name?: string;

  warehouse?: ID;
  warehouse_id?: ID;
  warehouse_code?: string;
  warehouse_name?: string;

  profile_code: string;
  title: string;
  description?: string;

  year?: number | null;
  total_pages?: number | null;
  retention_period?: RetentionPeriod | null;
  retention_period_display?: string;
  language?: string;
  note?: string;
  notes?: string;

  document_count?: number;
  digital_file_count?: number;
  has_pdf?: boolean;
  pdf_preview_url?: string | null;
  pdf_download_url?: string | null;
  profile_type?: string;
  file_notation?: string;
  preservation_unit_number?: string;
  historical_archive_code?: string;
  start_date?: string | null;
  end_date?: string | null;
  total_documents?: number | null;
  profile_group_name?: string;
  physical_condition?: string;
  keywords?: string;
  topic?: string;
  storage_position_text?: string;
  search_text?: string;
}

export interface ProfilePayload {
  catalog: ID | string;
  storage_file?: string | number | null;
  profile_code: string;
  title: string;
  description?: string;
  year?: number | null;
  total_pages?: number | null;
  retention_period?: string | null;
  language?: string;
  notes?: string;
  profile_type?: string;
  file_notation?: string;
  preservation_unit_number?: string;
  historical_archive_code?: string;
  start_date?: string | null;
  end_date?: string | null;
  total_documents?: number | null;
  profile_group_name?: string;
  physical_condition?: string;
  keywords?: string;
  topic?: string;
  storage_position_text?: string;
  search_text?: string;
}

export interface ProfileQueryParams
  extends ListQueryParams,
    YearFilter,
    HasPdfFilter {
  profile_code?: string;
  title?: string;
  fond?: ID | string;
  catalog?: ID | string;
  warehouse?: ID | string;
  location?: ID | string;
  box?: ID | string;
  box_number?: string;
  storage_file?: ID | string;
  file_number?: string;
  retention_period?: RetentionPeriod;
}

export interface ProfileListResult {
  results: Profile[];
  pagination: PaginationMeta;
}

export interface ProfileFormValues {
  fond: string;
  catalog: string;

  warehouse: string;
  location: string;
  box: string;
  storage_file: string;

  profile_code: string;
  title: string;
  description: string;
  year: string;
  total_pages: string;
  retention_period: string;
  language: string;
  notes: string;
  profile_type: string;
  file_notation: string;
  preservation_unit_number: string;
  historical_archive_code: string;
  start_date: string;
  end_date: string;
  total_documents: string;
  profile_group_name: string;
  physical_condition: string;
  keywords: string;
  topic: string;
  storage_position_text: string;
  search_text: string;
}
