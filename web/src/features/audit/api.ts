import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type {
  AuditLog,
  AuditLogFilters,
  AuditLogListResult,
  AuditLogPagination,
} from "@/features/audit/types";

interface BackendPagination {
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

interface BackendListEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T[];
  results?: T[];
  pagination?: BackendPagination;
  count?: number;
  next?: string | null;
  previous?: string | null;
}

function normalizePagination(
  payload: BackendListEnvelope<AuditLog>,
  filters: AuditLogFilters,
): AuditLogPagination | null {
  const pagination = payload.pagination;

  if (pagination) {
    return {
      page: pagination.page ?? filters.page ?? 1,
      page_size: pagination.page_size ?? filters.page_size ?? 20,
      total: pagination.total ?? 0,
      total_pages: pagination.total_pages ?? 1,
      has_next: Boolean(pagination.has_next),
      has_previous: Boolean(pagination.has_previous),
    };
  }

  if (typeof payload.count === "number") {
    const pageSize = filters.page_size ?? 20;

    return {
      page: filters.page ?? 1,
      page_size: pageSize,
      total: payload.count,
      total_pages: Math.max(1, Math.ceil(payload.count / pageSize)),
      has_next: Boolean(payload.next),
      has_previous: Boolean(payload.previous),
    };
  }

  return null;
}

function normalizeAuditList(
  payload:
    | AuditLog[]
    | ApiResponse<AuditLog[]>
    | BackendListEnvelope<AuditLog>,
  filters: AuditLogFilters,
): AuditLogListResult {
  if (Array.isArray(payload)) {
    return {
      results: payload,
      pagination: null,
    };
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    Array.isArray((payload as ApiResponse<AuditLog[]>).data)
  ) {
    const envelope = payload as BackendListEnvelope<AuditLog>;

    return {
      results: envelope.data ?? [],
      pagination: normalizePagination(envelope, filters),
    };
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "results" in payload
  ) {
    const envelope = payload as BackendListEnvelope<AuditLog>;

    return {
      results: envelope.results ?? [],
      pagination: normalizePagination(envelope, filters),
    };
  }

  return {
    results: [],
    pagination: null,
  };
}

function buildAuditParams(filters: AuditLogFilters) {
  return cleanQueryParams({
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,

    q: filters.q,
    search: filters.q,

    action: filters.action,
    user: filters.user,
    username: filters.user,

    date_from: filters.date_from,
    date_to: filters.date_to,
    created_at_after: filters.date_from,
    created_at_before: filters.date_to,
  });
}

function buildSafeAuditParams(filters: AuditLogFilters) {
  return cleanQueryParams({
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  });
}

export async function getAuditLogsApi(
  filters: AuditLogFilters = {},
): Promise<AuditLogListResult> {
  const hasAdvancedFilters = Boolean(
    filters.q ||
      filters.action ||
      filters.user ||
      filters.date_from ||
      filters.date_to,
  );

  try {
    const response = await apiClient.get<
      AuditLog[] | ApiResponse<AuditLog[]> | BackendListEnvelope<AuditLog>
    >(API_ENDPOINTS.audit.list, {
      params: buildAuditParams(filters),
    });

    return normalizeAuditList(response.data, filters);
  } catch (error) {
    if (!hasAdvancedFilters) {
      throw error;
    }

    const response = await apiClient.get<
      AuditLog[] | ApiResponse<AuditLog[]> | BackendListEnvelope<AuditLog>
    >(API_ENDPOINTS.audit.list, {
      params: buildSafeAuditParams(filters),
    });

    return normalizeAuditList(response.data, filters);
  }
}