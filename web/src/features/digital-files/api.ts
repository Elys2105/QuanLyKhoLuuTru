import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams, getAccessToken } from "@/lib/api/client";
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

type DirectUploadTokenResponse = {
  success: true;
  uploadUrl: string;
  pathname: string;
  registrationTicket: string;
  contentType: string;
  validUntil: number;
};

async function cleanupUnregisteredBlob(
  pathname: string,
  registrationTicket: string,
  accessToken: string,
): Promise<void> {
  try {
    await fetch("/api/digital-files/direct-upload-cleanup", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        pathname,
        registration_ticket: registrationTicket,
      }),
      cache: "no-store",
    });
  } catch {
    // Best effort only. Registration remains the source-of-truth boundary.
  }
}

export async function uploadDigitalFileApi(
  payload: DigitalFileUploadPayload,
): Promise<DigitalFile> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  if (!payload.file || payload.file.size <= 0) {
    throw new Error("File upload không hợp lệ.");
  }

  if (payload.file.size > 100 * 1024 * 1024) {
    throw new Error("File vượt quá giới hạn 100 MB.");
  }

  const tokenResponse = await fetch(
    "/api/digital-files/direct-upload-token",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        profile: payload.profile,
        document: payload.document ?? null,
        original_name: payload.file.name,
        file_size: payload.file.size,
        mime_type: payload.file.type || "",
        is_primary: Boolean(payload.is_primary),
      }),
      cache: "no-store",
    },
  );

  if (!tokenResponse.ok) {
    const message = await tokenResponse.text();

    throw new Error(
      message || "Không thể cấp quyền upload file trực tiếp.",
    );
  }

  const uploadGrant =
    (await tokenResponse.json()) as DirectUploadTokenResponse;

  const putResponse = await fetch(uploadGrant.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": uploadGrant.contentType,
    },
    body: payload.file,
  });

  if (!putResponse.ok) {
    throw new Error(
      `Upload Private Blob thất bại (HTTP ${putResponse.status}).`,
    );
  }

  try {
    const response = await apiClient.post<
      DigitalFile | ApiResponse<DigitalFile>
    >(
      API_ENDPOINTS.digitalFiles.registerBlob,
      {
        profile: payload.profile,
        document: payload.document ?? null,
        blob_path: uploadGrant.pathname,
        registration_ticket: uploadGrant.registrationTicket,
        original_name: payload.file.name,
        file_size: payload.file.size,
        mime_type: uploadGrant.contentType,
        is_primary: Boolean(payload.is_primary),
      },
    );

    return unwrapDetailResponse<DigitalFile>(response.data);
  } catch (error) {
    await cleanupUnregisteredBlob(
      uploadGrant.pathname,
      uploadGrant.registrationTicket,
      accessToken,
    );

    throw error;
  }
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