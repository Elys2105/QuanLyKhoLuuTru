import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import { unwrapDetailResponse } from "@/lib/api/normalize";
import type { ApiResponse } from "@/types/api";
import type { ArchiveTreeResponse } from "@/features/archive-tree/types";

export async function getArchiveTreeApi(): Promise<ArchiveTreeResponse> {
  const response = await apiClient.get<
    ArchiveTreeResponse | ApiResponse<ArchiveTreeResponse>
  >(API_ENDPOINTS.archiveTree.tree);

  return unwrapDetailResponse<ArchiveTreeResponse>(response.data);
}