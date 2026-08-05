import type { ApiResponse } from "@/types/api";
import type { PaginatedData, PaginationMeta } from "@/types/pagination";

export interface NormalizedListResult<T> {
  results: T[];
  pagination: PaginationMeta;
}

type ObjectListPayload<T> = {
  results?: T[];
  pagination?: PaginationMeta;
  count?: number;
  next?: string | null;
  previous?: string | null;
  total?: number;
};

export type MaybeWrappedListResponse<T> =
  | T[]
  | PaginatedData<T>
  | ObjectListPayload<T>
  | ApiResponse<T[] | PaginatedData<T> | ObjectListPayload<T>>;

export function isApiResponse<T>(
  payload: unknown,
): payload is ApiResponse<T> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
  );
}

export function normalizeListResponse<T>(
  payload: MaybeWrappedListResponse<T>,
): NormalizedListResult<T> {
  const data = isApiResponse<T[] | PaginatedData<T> | ObjectListPayload<T>>(
    payload,
  )
    ? payload.data
    : payload;

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

  const objectData = data as ObjectListPayload<T>;
  const results = objectData.results ?? [];

  const total =
    objectData.pagination?.total ??
    objectData.pagination?.count ??
    objectData.count ??
    objectData.total ??
    results.length;

  const page = objectData.pagination?.page ?? 1;
  const pageSize = objectData.pagination?.page_size ?? 20;
  const totalPages =
    objectData.pagination?.total_pages ??
    Math.max(1, Math.ceil(total / pageSize));

  return {
    results,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
      count: objectData.count,
      next: objectData.next,
      previous: objectData.previous,
    },
  };
}

export function unwrapDetailResponse<T>(payload: T | ApiResponse<T>): T {
  if (isApiResponse<T>(payload)) {
    return payload.data;
  }

  return payload;
}