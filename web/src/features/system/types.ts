export interface StorageHealth {
  ok: boolean;
  status: "ok" | "warning" | "error" | string;
  storage_root: string;
  media_root: string;
  media_url: string;

  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  free_percent: number;

  total_display: string;
  used_display: string;
  free_display: string;

  target_bytes: number;
  target_display: string;

  supports_500gb: boolean;
  supports_1tb: boolean;

  low_free_bytes: number;
  low_free_display: string;

  subfolders: Record<string, boolean>;

  scan_enabled: boolean;
  scanned_bytes?: number | null;
  scanned_display?: string | null;
  scanned_file_count?: number | null;
  scan_truncated?: boolean;

  warnings: string[];
}