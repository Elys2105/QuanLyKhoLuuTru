import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type { DashboardData } from "@/features/dashboard/types";

type MaybeWrappedDashboardResponse =
  | DashboardData
  | ApiResponse<DashboardData>;

function isWrappedDashboardResponse(
  payload: unknown,
): payload is ApiResponse<DashboardData> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
  );
}

function unwrapDashboardResponse(
  payload: MaybeWrappedDashboardResponse,
): DashboardData {
  if (isWrappedDashboardResponse(payload)) {
    return payload.data;
  }

  return payload;
}

export async function getDashboardApi(): Promise<DashboardData> {
  const response = await apiClient.get<MaybeWrappedDashboardResponse>(
    API_ENDPOINTS.dashboard.summary,
  );

  return unwrapDashboardResponse(response.data);
}