import type { ID } from "@/types/common";

export interface DashboardSummary {
  fonds?: number;
  catalogs?: number;
  warehouses?: number;
  locations?: number;
  boxes?: number;
  storage_files?: number;
  profiles?: number;
  documents?: number;
  digital_files?: number;
  ocr_jobs?: number;

  total_fonds?: number;
  total_catalogs?: number;
  total_warehouses?: number;
  total_locations?: number;
  total_boxes?: number;
  total_storage_files?: number;
  total_profiles?: number;
  total_documents?: number;
  total_digital_files?: number;
  total_ocr_jobs?: number;

  [key: string]: number | undefined;
}

export interface DashboardChartItem {
  label: string;
  value: number;
}

export interface DashboardLatestProfile {
  id: ID;
  profile_code?: string;
  code?: string;
  title: string;
  year?: number | null;
  created_at?: string;
}

export interface DashboardLatestDigitalFile {
  id: ID;
  original_name?: string;
  file_name?: string;
  profile?: ID;
  profile_code?: string;
  file_size?: number;
  created_at?: string;
}

export interface DashboardLatestData {
  profiles?: DashboardLatestProfile[];
  digital_files?: DashboardLatestDigitalFile[];
  latest_profiles?: DashboardLatestProfile[];
  latest_digital_files?: DashboardLatestDigitalFile[];
}

export interface DashboardCharts {
  profiles_by_year?: DashboardChartItem[];
  profiles_by_retention?: DashboardChartItem[];
  digital_files_by_month?: DashboardChartItem[];

  [key: string]: DashboardChartItem[] | undefined;
}

export interface DashboardData {
  summary: DashboardSummary;
  charts?: DashboardCharts;
  latest?: DashboardLatestData;
}