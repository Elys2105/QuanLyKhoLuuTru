import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { STORAGE_KEYS } from "@/constants/storage-keys";
import type {
  ApiErrorResponse,
  ApiQueryParams,
  ApiQueryValue,
  ApiResponse,
} from "@/types/api";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isBrowserFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setAccessToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export function removeAccessToken(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setRefreshToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
}

export function clearAuthStorage(): void {
  if (!isBrowser()) return;

  window.localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000,
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const headers = AxiosHeaders.from(config.headers);

    headers.set("Accept", "application/json");

    if (!isBrowserFormData(config.data)) {
      headers.set("Content-Type", "application/json; charset=utf-8");
    }

    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    config.headers = headers;

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      clearAuthStorage();

      if (isBrowser()) {
        window.dispatchEvent(new Event("archive-auth-unauthorized"));
      }
    }

    return Promise.reject(error);
  },
);

export function cleanQueryParams(
  params?: ApiQueryParams | null,
): Record<string, string | number | boolean> {
  if (!params) return {};

  const cleaned: Record<string, string | number | boolean> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (isEmptyQueryValue(value)) return;
    cleaned[key] = value;
  });

  return cleaned;
}

function isEmptyQueryValue(value: ApiQueryValue): value is null | undefined | "" {
  return value === null || value === undefined || value === "";
}

export function buildQueryString(params?: ApiQueryParams | null): string {
  const cleaned = cleanQueryParams(params);
  const searchParams = new URLSearchParams();

  Object.entries(cleaned).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
}

export async function unwrapApiResponse<T>(
  request: Promise<AxiosResponse<ApiResponse<T>>>,
): Promise<T> {
  const response = await request;
  return response.data.data;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Có lỗi xảy ra. Vui lòng thử lại.",
): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  const responseData = error.response?.data;

  if (!responseData) {
    return error.message || fallback;
  }

  if (typeof responseData.detail === "string" && responseData.detail) {
    return responseData.detail;
  }

  if (typeof responseData.message === "string" && responseData.message) {
    return responseData.message;
  }

  if (typeof responseData.errors === "string" && responseData.errors) {
    return responseData.errors;
  }

  if (responseData.errors && typeof responseData.errors === "object") {
    const firstError = Object.values(responseData.errors)[0];

    if (Array.isArray(firstError)) {
      return firstError[0] || fallback;
    }

    if (typeof firstError === "string") {
      return firstError;
    }
  }

  return fallback;
}

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}