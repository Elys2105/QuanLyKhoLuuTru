import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import type { ApiQueryParams, ApiResponse } from "@/types/api";
import type { PaginatedData } from "@/types/pagination";
import type {
  SearchProfileParams,
  SearchProfileResult,
  SearchProfilesResult,
} from "@/features/search/types";

type SearchProfilesObjectPayload = {
  results?: SearchProfileResult[];
  pagination?: {
    page?: number;
    page_size?: number;
    total?: number;
    total_pages?: number;
    count?: number;
    next?: string | null;
    previous?: string | null;
  };
  count?: number;
  next?: string | null;
  previous?: string | null;
  total?: number;
};

type SearchProfilesPayload =
  | PaginatedData<SearchProfileResult>
  | SearchProfileResult[]
  | SearchProfilesObjectPayload;

type MaybeWrappedSearchResponse =
  | SearchProfilesPayload
  | ApiResponse<SearchProfilesPayload>;

function isWrappedSearchResponse(
  payload: unknown,
): payload is ApiResponse<SearchProfilesPayload> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
  );
}

function normalizeSearchPayload(
  payload: SearchProfilesPayload,
): SearchProfilesResult {
  if (Array.isArray(payload)) {
    return {
      results: payload,
      pagination: {
        page: 1,
        page_size: payload.length,
        total: payload.length,
        total_pages: 1,
      },
    };
  }

  const objectPayload = payload as SearchProfilesObjectPayload;

  const results = objectPayload.results ?? [];

  const total =
    objectPayload.pagination?.total ??
    objectPayload.pagination?.count ??
    objectPayload.count ??
    objectPayload.total ??
    results.length;

  const page = objectPayload.pagination?.page ?? 1;
  const pageSize = objectPayload.pagination?.page_size ?? 20;

  const totalPages =
    objectPayload.pagination?.total_pages ??
    Math.max(1, Math.ceil(total / pageSize));

  return {
    results,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
      count: objectPayload.count,
      next: objectPayload.next,
      previous: objectPayload.previous,
    },
  };
}

function unwrapSearchResponse(
  payload: MaybeWrappedSearchResponse,
): SearchProfilesResult {
  if (isWrappedSearchResponse(payload)) {
    return normalizeSearchPayload(payload.data);
  }

  return normalizeSearchPayload(payload);
}

function toApiQueryParams(params: SearchProfileParams): ApiQueryParams {
  return {
    q: params.q,
    search: params.search,
    ordering: params.ordering,
    page: params.page,
    page_size: params.page_size,

    profile_code: params.profile_code,
    title: params.title,
    document_code: params.document_code,
    document_title: params.document_title,

    fond: params.fond,
    catalog: params.catalog,
    warehouse: params.warehouse,
    location: params.location,
    box: params.box,
    box_number: params.box_number,
    storage_file: params.storage_file,
    file_number: params.file_number,

    year: params.year,
    has_pdf: params.has_pdf,
    retention_period: params.retention_period,
  };
}

export async function searchProfilesApi(
  params: SearchProfileParams,
): Promise<SearchProfilesResult> {
  const response = await apiClient.get<MaybeWrappedSearchResponse>(
    API_ENDPOINTS.search.profiles,
    {
      params: cleanQueryParams(toApiQueryParams(params)),
    },
  );

  return unwrapSearchResponse(response.data);
}