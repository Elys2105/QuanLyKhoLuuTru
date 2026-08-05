import type { ID } from "@/types/common";

export interface AuditLog {
  id: ID;

  user?: ID | null;
  user_id?: ID | null;
  username?: string;
  user_username?: string;
  created_by_username?: string;

  action?: string;
  action_display?: string;
  module?: string;
  app_label?: string;
  model?: string;
  object_type?: string;
  object_repr?: string;
  object_id?: ID | null;

  description?: string;
  message?: string;
  detail?: string;

  ip_address?: string;
  user_agent?: string;

  path?: string;
  method?: string;

  created_at?: string;
  timestamp?: string;
  time?: string;

  metadata?: Record<string, unknown> | null;
  changes?: Record<string, unknown> | null;
}

export interface AuditLogPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface AuditLogListResult {
  results: AuditLog[];
  pagination: AuditLogPagination | null;
}

export interface AuditLogFilters {
  q?: string;
  action?: string;
  user?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}