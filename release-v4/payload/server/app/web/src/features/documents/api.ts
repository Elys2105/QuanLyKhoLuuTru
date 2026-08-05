import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import {
  normalizeListResponse,
  type MaybeWrappedListResponse,
  unwrapDetailResponse,
} from "@/lib/api/normalize";
import type { ApiQueryParams, ApiResponse } from "@/types/api";
import type {
  Document,
  DocumentListResult,
  DocumentPayload,
  DocumentQueryParams,
} from "@/features/documents/types";

function toApiQueryParams(params?: DocumentQueryParams): ApiQueryParams {
  return {
    q: params?.q,
    search: params?.search,
    ordering: params?.ordering,
    page: params?.page,
    page_size: params?.page_size,
    profile: params?.profile,
    document_code: params?.document_code,
    title: params?.title,
    author: params?.author,
    year: params?.year,
  };
}

export async function getDocumentsListApi(
  params?: DocumentQueryParams,
): Promise<DocumentListResult> {
  const response = await apiClient.get<MaybeWrappedListResponse<Document>>(
    API_ENDPOINTS.documents.list,
    {
      params: cleanQueryParams(toApiQueryParams(params)),
    },
  );

  return normalizeListResponse<Document>(response.data);
}

export async function getDocumentsApi(
  params?: DocumentQueryParams,
): Promise<Document[]> {
  const result = await getDocumentsListApi(params);

  return result.results;
}

export async function getDocumentByIdApi(
  id: string | number,
): Promise<Document> {
  const response = await apiClient.get<Document | ApiResponse<Document>>(
    API_ENDPOINTS.documents.detail(id),
  );

  return unwrapDetailResponse<Document>(response.data);
}

export async function createDocumentApi(
  payload: DocumentPayload,
): Promise<Document> {
  const response = await apiClient.post<Document | ApiResponse<Document>>(
    API_ENDPOINTS.documents.list,
    payload,
  );

  return unwrapDetailResponse<Document>(response.data);
}

export async function updateDocumentApi(
  id: string | number,
  payload: Partial<DocumentPayload>,
): Promise<Document> {
  const response = await apiClient.patch<Document | ApiResponse<Document>>(
    API_ENDPOINTS.documents.detail(id),
    payload,
  );

  return unwrapDetailResponse<Document>(response.data);
}

export async function deleteDocumentApi(
  id: string | number,
): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.documents.detail(id));
}