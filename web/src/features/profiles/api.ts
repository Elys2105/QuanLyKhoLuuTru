import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import {
  normalizeListResponse,
  type MaybeWrappedListResponse,
  unwrapDetailResponse,
} from "@/lib/api/normalize";
import type { ApiQueryParams, ApiResponse } from "@/types/api";
import type {
  Profile,
  ProfileListResult,
  ProfilePayload,
  ProfileQueryParams,
} from "@/features/profiles/types";

function toApiQueryParams(params?: ProfileQueryParams): ApiQueryParams {
  return {
    q: params?.q,
    search: params?.search,
    ordering: params?.ordering,
    page: params?.page,
    page_size: params?.page_size,
    profile_code: params?.profile_code,
    title: params?.title,
    fond: params?.fond,
    catalog: params?.catalog,
    warehouse: params?.warehouse,
    location: params?.location,
    box: params?.box,
    box_number: params?.box_number,
    storage_file: params?.storage_file,
    file_number: params?.file_number,
    year: params?.year,
    has_pdf: params?.has_pdf,
    retention_period: params?.retention_period,
  };
}

export async function getProfilesApi(
  params?: ProfileQueryParams,
): Promise<ProfileListResult> {
  const response = await apiClient.get<MaybeWrappedListResponse<Profile>>(
    API_ENDPOINTS.profiles.list,
    {
      params: cleanQueryParams(toApiQueryParams(params)),
    },
  );

  return normalizeListResponse<Profile>(response.data);
}

export async function getProfileByIdApi(id: string | number): Promise<Profile> {
  const response = await apiClient.get<Profile | ApiResponse<Profile>>(
    API_ENDPOINTS.profiles.detail(id),
  );

  return unwrapDetailResponse<Profile>(response.data);
}

export async function createProfileApi(
  payload: ProfilePayload,
): Promise<Profile> {
  const response = await apiClient.post<Profile | ApiResponse<Profile>>(
    API_ENDPOINTS.profiles.list,
    payload,
  );

  return unwrapDetailResponse<Profile>(response.data);
}

export async function updateProfileApi(
  id: string | number,
  payload: Partial<ProfilePayload>,
): Promise<Profile> {
  const response = await apiClient.patch<Profile | ApiResponse<Profile>>(
    API_ENDPOINTS.profiles.detail(id),
    payload,
  );

  return unwrapDetailResponse<Profile>(response.data);
}

export async function deleteProfileApi(id: string | number): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.profiles.detail(id));
}