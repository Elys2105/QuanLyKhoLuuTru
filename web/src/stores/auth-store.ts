"use client";

import { create } from "zustand";

import {
  getCurrentUserApi,
  loginApi,
  logoutApi,
} from "@/features/auth/api";
import type { AuthStoreState } from "@/features/auth/types";
import { getApiErrorMessage } from "@/lib/api/client";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import type { CurrentUser, LoginRequest } from "@/types/auth";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorageItem(key: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

function setStorageItem(key: string, value: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
}

function removeStorageItem(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

function clearAuthStorage(): void {
  removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
  removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  removeStorageItem(STORAGE_KEYS.CURRENT_USER);
}

function saveUserToStorage(user: CurrentUser | null): void {
  if (!user) {
    removeStorageItem(STORAGE_KEYS.CURRENT_USER);
    return;
  }

  setStorageItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

function readUserFromStorage(): CurrentUser | null {
  const rawUser = getStorageItem(STORAGE_KEYS.CURRENT_USER);

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as CurrentUser;
  } catch {
    removeStorageItem(STORAGE_KEYS.CURRENT_USER);
    return null;
  }
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,

  isHydrated: false,
  isAuthenticated: false,
  isLoading: false,

  error: null,

  hydrateAuth: () => {
    const accessToken = getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
    const user = readUserFromStorage();

    set({
      accessToken,
      refreshToken,
      user,
      isHydrated: true,
      isAuthenticated: Boolean(accessToken),
      error: null,
    });
  },

  login: async (payload: LoginRequest) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const loginResult = await loginApi(payload);

      if (!loginResult.access) {
        throw new Error("Backend không trả access token.");
      }

      setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, loginResult.access);

      if (loginResult.refresh) {
        setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, loginResult.refresh);
      } else {
        removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
      }

      let currentUser = loginResult.user ?? null;

      set({
        accessToken: loginResult.access,
        refreshToken: loginResult.refresh ?? null,
        user: currentUser,
        isAuthenticated: true,
        isHydrated: true,
      });

      if (!currentUser) {
        currentUser = await getCurrentUserApi();
      }

      saveUserToStorage(currentUser);

      set({
        user: currentUser,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      return currentUser;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Đăng nhập thất bại. Vui lòng kiểm tra tài khoản hoặc mật khẩu.",
      );

      clearAuthStorage();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
        error: message,
      });

      throw error;
    }
  },

  fetchCurrentUser: async () => {
    const currentAccessToken =
      get().accessToken || getStorageItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!currentAccessToken) {
      clearAuthStorage();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isHydrated: true,
      });

      throw new Error("Chưa đăng nhập.");
    }

    set({
      isLoading: true,
      error: null,
    });

    try {
      const user = await getCurrentUserApi();

      saveUserToStorage(user);

      set({
        user,
        accessToken: currentAccessToken,
        refreshToken: getStorageItem(STORAGE_KEYS.REFRESH_TOKEN),
        isAuthenticated: true,
        isHydrated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
      );

      clearAuthStorage();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isHydrated: true,
        isLoading: false,
        error: message,
      });

      throw error;
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;

    set({
      isLoading: true,
      error: null,
    });

    try {
      await logoutApi(refreshToken);
    } catch {
      // Nếu backend logout lỗi do token hết hạn, frontend vẫn phải xóa phiên local.
    } finally {
      clearAuthStorage();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isHydrated: true,
        isLoading: false,
        error: null,
      });
    }
  },

  clearAuth: () => {
    clearAuthStorage();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: true,
      isLoading: false,
      error: null,
    });
  },

  setUser: (user: CurrentUser | null) => {
    saveUserToStorage(user);

    set({
      user,
    });
  },
}));