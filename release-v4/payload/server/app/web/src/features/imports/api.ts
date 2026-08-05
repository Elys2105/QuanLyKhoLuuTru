import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type {
  ProfileImportPayload,
  ProfileImportResult,
} from "@/features/imports/types";

function unwrapImportResponse(
  payload: ProfileImportResult | ApiResponse<ProfileImportResult>,
): ProfileImportResult {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload
  ) {
    const wrappedPayload = payload as ApiResponse<ProfileImportResult>;
    return wrappedPayload.data;
  }

  return payload as ProfileImportResult;
}

export async function downloadProfileImportTemplateApi(): Promise<Blob> {
  const response = await apiClient.get(
    API_ENDPOINTS.imports.profileTemplate,
    {
      responseType: "blob",
    },
  );

  return response.data as Blob;
}

export async function importProfilesExcelApi(
  payload: ProfileImportPayload,
): Promise<ProfileImportResult> {
  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("dry_run", payload.dry_run ? "true" : "false");

  if (payload.sheet_name) {
    formData.append("sheet_name", payload.sheet_name);
  }

  if (payload.client_rows_json) {
    formData.append("client_rows_json", payload.client_rows_json);
  }

  const response = await apiClient.post<
    ProfileImportResult | ApiResponse<ProfileImportResult>
  >(
    API_ENDPOINTS.imports.profiles,
    formData,
  );

  return unwrapImportResponse(response.data);
}