import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import {
  normalizeListResponse,
  type MaybeWrappedListResponse,
  unwrapDetailResponse,
} from "@/lib/api/normalize";
import type { ApiQueryParams, ApiResponse } from "@/types/api";
import type {
  DigitalFile,
  DigitalFileQueryParams,
  DigitalFileUploadPayload,
} from "@/features/digital-files/types";

function toApiQueryParams(params: DigitalFileQueryParams): ApiQueryParams {
  return {
    q: params.q,
    search: params.search,
    ordering: params.ordering,
    page: params.page,
    page_size: params.page_size,
    profile: params.profile,
    document: params.document,
    is_primary: params.is_primary,
    mime_type: params.mime_type,
  };
}

export async function getDigitalFilesApi(
  params: DigitalFileQueryParams,
): Promise<DigitalFile[]> {
  const response = await apiClient.get<MaybeWrappedListResponse<DigitalFile>>(
    API_ENDPOINTS.digitalFiles.list,
    {
      params: cleanQueryParams(toApiQueryParams(params)),
    },
  );

  return normalizeListResponse<DigitalFile>(response.data).results;
}

export async function uploadDigitalFileApi(
  payload: DigitalFileUploadPayload,
): Promise<DigitalFile> {
  const formData = new FormData();

  formData.append("profile", String(payload.profile));
  formData.append("file", payload.file);
  formData.append("is_primary", payload.is_primary ? "true" : "false");

  if (payload.document) {
    formData.append("document", String(payload.document));
  }

  const response = await apiClient.post<
    DigitalFile | ApiResponse<DigitalFile>
  >(
    API_ENDPOINTS.digitalFiles.list,
    formData,
  );

  return unwrapDetailResponse<DigitalFile>(response.data);
}

export async function getDigitalFilePreviewBlobApi(
  digitalFileId: string | number,
): Promise<Blob> {
  const response = await apiClient.get(
    API_ENDPOINTS.digitalFiles.preview(digitalFileId),
    {
      responseType: "blob",
    },
  );

  return response.data as Blob;
}

export async function getDigitalFileDownloadBlobApi(
  digitalFileId: string | number,
): Promise<Blob> {
  const response = await apiClient.get(
    API_ENDPOINTS.digitalFiles.download(digitalFileId),
    {
      responseType: "blob",
    },
  );

  return response.data as Blob;
}