import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type {
  ChangePasswordRequest,
  CurrentUser,
  LoginRequest,
  LoginResponse,
} from "@/types/auth";

type MaybeWrappedResponse<T> = T | ApiResponse<T>;

function isWrappedApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
  );
}

function unwrapMaybeApiResponse<T>(payload: MaybeWrappedResponse<T>): T {
  if (isWrappedApiResponse<T>(payload)) {
    return payload.data;
  }

  return payload as T;
}

export async function loginApi(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<MaybeWrappedResponse<LoginResponse>>(
    API_ENDPOINTS.auth.login,
    payload,
  );

  return unwrapMaybeApiResponse<LoginResponse>(response.data);
}

export async function getCurrentUserApi(): Promise<CurrentUser> {
  const response = await apiClient.get<MaybeWrappedResponse<CurrentUser>>(
    API_ENDPOINTS.auth.me,
  );

  return unwrapMaybeApiResponse<CurrentUser>(response.data);
}

export async function logoutApi(refreshToken?: string | null): Promise<void> {
  await apiClient.post(
    API_ENDPOINTS.auth.logout,
    refreshToken ? { refresh: refreshToken } : {},
  );
}

export async function changePasswordApi(
  payload: ChangePasswordRequest,
): Promise<void> {
  await apiClient.post(API_ENDPOINTS.auth.changePassword, payload);
}