import type { BaseEntity, ID } from "@/types/common";
import type { ListQueryParams } from "@/types/pagination";

export type DigitalFileType = "pdf" | "word" | "excel" | "unknown" | string;

export interface DigitalFile extends BaseEntity {
  profile: ID;
  profile_id?: ID;
  profile_code?: string;
  profile_title?: string;

  document?: ID | null;
  document_id?: ID | null;
  document_code?: string | null;
  document_title?: string | null;

  file?: string;
  storage_path?: string;
  file_url?: string;

  original_name: string;
  file_size?: number;
  mime_type?: string;

  file_extension?: string;
  file_type?: DigitalFileType;
  file_type_label?: string;
  is_pdf?: boolean;
  is_word?: boolean;
  is_excel?: boolean;
  can_preview_inline?: boolean;

  page_count?: number | null;
  is_primary?: boolean;

  preview_url?: string;
  download_url?: string;
  pdf_preview_url?: string;
  pdf_download_url?: string;
}

export interface DigitalFileUploadPayload {
  profile: ID | string;
  document?: ID | string | null;
  file: File;
  is_primary?: boolean;
}

export interface DigitalFileQueryParams extends ListQueryParams {
  profile?: ID | string;
  document?: ID | string;
  is_primary?: boolean | string;
  mime_type?: string;
  file_type?: DigitalFileType;
}