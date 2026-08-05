import type { ID } from "@/types/common";

export interface ArchiveTreeDigitalFile {
  id: ID;
  original_name: string;
  file_size?: number;
  mime_type?: string;
  page_count?: number | null;
  is_primary?: boolean;

  file_url?: string;
  preview_url?: string;
  download_url?: string;
  pdf_preview_url?: string;
  pdf_download_url?: string;
}

export interface ArchiveTreeProfile {
  id: ID;
  profile_code: string;
  title: string;
  year?: number | null;
  has_pdf?: boolean;
  digital_file_count?: number;
  document_count?: number;
  digital_files?: ArchiveTreeDigitalFile[];
}

export interface ArchiveTreeStorageFile {
  id: ID;
  file_number?: string;
  storage_file_number?: string;
  title?: string;
  storage_file_title?: string;
  profile_count?: number;
  profiles?: ArchiveTreeProfile[];
}

export interface ArchiveTreeBox {
  id: ID;
  box_number: string;
  title?: string;
  box_title?: string;
  storage_file_count?: number;
  profile_count?: number;
  storage_files?: ArchiveTreeStorageFile[];
}

export interface ArchiveTreeLocation {
  id: ID;
  code: string;
  name: string;
  box_count?: number;
  profile_count?: number;
  boxes?: ArchiveTreeBox[];
}

export interface ArchiveTreeWarehouse {
  id: ID;
  code: string;
  name: string;
  location_count?: number;
  box_count?: number;
  profile_count?: number;
  locations?: ArchiveTreeLocation[];
}

export interface ArchiveTreeSummary {
  warehouses?: number;
  locations?: number;
  boxes?: number;
  storage_files?: number;
  profiles?: number;
  digital_files?: number;

  total_warehouses?: number;
  total_locations?: number;
  total_boxes?: number;
  total_storage_files?: number;
  total_profiles?: number;
  total_digital_files?: number;
}

export interface ArchiveTreeResponse {
  summary: ArchiveTreeSummary;
  tree: ArchiveTreeWarehouse[];
}