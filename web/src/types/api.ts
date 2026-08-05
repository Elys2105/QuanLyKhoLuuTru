import type { PaginatedData, PaginationMeta } from "@/types/pagination";

export type ApiId = number | string;

export type ApiFieldErrorValue = string | string[];

export type ApiFieldErrors = Record<string, ApiFieldErrorValue>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors?: ApiFieldErrors | string | null;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  detail?: string;
  errors?: ApiFieldErrors | string | null;
}

export interface ApiListResponse<T> extends ApiResponse<PaginatedData<T>> {}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}

export interface ApiSelectOption<TValue extends string | number = string | number> {
  label: string;
  value: TValue;
  description?: string;
}

export interface ApiFileInfo {
  id: number;
  original_name?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  preview_url?: string;
  download_url?: string;
}

export interface ApiDateRangeParams {
  date_from?: string;
  date_to?: string;
}

export type ApiQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type ApiQueryParams = Record<string, ApiQueryValue>;

export interface NormalizedApiList<T> {
  results: T[];
  pagination: PaginationMeta;
}

export function normalizeApiList<T>(
  data: PaginatedData<T> | T[] | null | undefined,
): NormalizedApiList<T> {
  if (!data) {
    return {
      results: [],
      pagination: {
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 1,
      },
    };
  }

  if (Array.isArray(data)) {
    return {
      results: data,
      pagination: {
        page: 1,
        page_size: data.length,
        total: data.length,
        total_pages: 1,
      },
    };
  }

  return {
    results: data.results ?? [],
    pagination: {
      page: data.pagination?.page ?? 1,
      page_size: data.pagination?.page_size ?? 20,
      total: data.pagination?.total ?? data.count ?? data.results?.length ?? 0,
      total_pages: data.pagination?.total_pages ?? 1,
      count: data.count,
      next: data.next,
      previous: data.previous,
    },
  };
}