import { registerOcrCompletionWatch } from "@/features/ocr/completion-watch";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type {
  OcrJob,
  OcrRunResult,
  OcrSearchResult,
  OcrTextResult,
  OcrProfileSuggestionResult,
} from "@/features/ocr/types";

function unwrapData<T>(payload: T | ApiResponse<T>): T {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload
  ) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
}

function unwrapList<T>(payload: T[] | ApiResponse<T[]> | { results?: T[] }): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload
  ) {
    const data = (payload as ApiResponse<T[]>).data;
    return Array.isArray(data) ? data : [];
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "results" in payload
  ) {
    return ((payload as { results?: T[] }).results ?? []);
  }

  return [];
}

export async function runOcrForDigitalFileApi(
  digitalFileId: string | number,
): Promise<OcrRunResult> {
  const response = await apiClient.post<
    OcrRunResult | ApiResponse<OcrRunResult>
  >(
    API_ENDPOINTS.ocr.runForDigitalFile(digitalFileId),
    {},
  );

  const result = unwrapData<OcrRunResult>(response.data);
  const targetJob = result.quality_job ?? result.fast_job ?? result.job;

  registerOcrCompletionWatch(digitalFileId, targetJob);

  return result;
}

export async function getOcrTextForDigitalFileApi(
  digitalFileId: string | number,
): Promise<OcrTextResult> {
  const response = await apiClient.get<
    OcrTextResult | ApiResponse<OcrTextResult>
  >(
    API_ENDPOINTS.ocr.textForDigitalFile(digitalFileId),
  );

  return unwrapData<OcrTextResult>(response.data);
}

export async function getOcrProfileSuggestionApi(
  digitalFileId: string | number,
): Promise<OcrProfileSuggestionResult> {
  const response = await apiClient.get<
    OcrProfileSuggestionResult | ApiResponse<OcrProfileSuggestionResult>
  >(
    API_ENDPOINTS.ocr.profileSuggestion(digitalFileId),
  );

  return unwrapData<OcrProfileSuggestionResult>(response.data);
}

export async function getOcrJobsApi(): Promise<OcrJob[]> {
  const response = await apiClient.get<
    OcrJob[] | ApiResponse<OcrJob[]> | { results?: OcrJob[] }
  >(
    API_ENDPOINTS.ocr.jobs,
  );

  return unwrapList<OcrJob>(response.data);
}

export async function getOcrJobDetailApi(
  jobId: string | number,
): Promise<OcrJob> {
  const response = await apiClient.get<OcrJob | ApiResponse<OcrJob>>(
    API_ENDPOINTS.ocr.jobDetail(jobId),
  );

  return unwrapData<OcrJob>(response.data);
}

export async function searchOcrApi(
  query: string,
): Promise<OcrSearchResult> {
  const response = await apiClient.get<
    OcrSearchResult | ApiResponse<OcrSearchResult>
  >(
    API_ENDPOINTS.ocr.search,
    {
      params: cleanQueryParams({
        q: query,
      }),
    },
  );

  return unwrapData<OcrSearchResult>(response.data);
}
export async function getOcrProgressForDigitalFileApi(
  digitalFileId: string | number,
): Promise<OcrJob[]> {
  const response = await apiClient.get<
    OcrJob[] | ApiResponse<OcrJob[]>
  >(`/api/ocr/digital-files/${digitalFileId}/progress/`);

  return unwrapList<OcrJob>(response.data);
}

export async function deleteOcrForDigitalFileApi(
  digitalFileId: string | number,
): Promise<void> {
  await apiClient.delete(
    `/api/ocr/digital-files/${digitalFileId}/delete/`,
  );
}