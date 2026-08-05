import type { Profile, ProfilePayload } from "@/features/profiles/types";

export type OfflineProfileStatus = "pending" | "failed";

export interface OfflineProfileItem {
  id: string;
  payload: ProfilePayload;
  createdAt: string;
  updatedAt: string;
  status: OfflineProfileStatus;
  errorMessage?: string;
}

export interface OfflineProfileCache {
  catalogs: unknown[];
  storageFiles: unknown[];
  profiles: Profile[];
  updatedAt?: string;
}

const OFFLINE_PROFILES_KEY = "archive_management_offline_profiles_v1";
const OFFLINE_CACHE_KEY = "archive_management_offline_profile_cache_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function createOfflineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  const raw = window.localStorage.getItem(key);

  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getOfflineProfiles(): OfflineProfileItem[] {
  return readJson<OfflineProfileItem[]>(OFFLINE_PROFILES_KEY, []);
}

export function saveOfflineProfiles(items: OfflineProfileItem[]): void {
  writeJson(OFFLINE_PROFILES_KEY, items);
}

export function addOfflineProfile(payload: ProfilePayload): OfflineProfileItem {
  const now = new Date().toISOString();

  const item: OfflineProfileItem = {
    id: createOfflineId(),
    payload,
    createdAt: now,
    updatedAt: now,
    status: "pending",
  };

  const items = getOfflineProfiles();
  saveOfflineProfiles([item, ...items]);

  return item;
}

export function removeOfflineProfile(id: string): void {
  const items = getOfflineProfiles().filter((item) => item.id !== id);
  saveOfflineProfiles(items);
}

export function updateOfflineProfile(
  id: string,
  patch: Partial<OfflineProfileItem>,
): void {
  const now = new Date().toISOString();

  const items = getOfflineProfiles().map((item) => {
    if (item.id !== id) return item;

    return {
      ...item,
      ...patch,
      updatedAt: now,
    };
  });

  saveOfflineProfiles(items);
}

export function getOfflineProfileCache(): OfflineProfileCache {
  return readJson<OfflineProfileCache>(OFFLINE_CACHE_KEY, {
    catalogs: [],
    storageFiles: [],
    profiles: [],
  });
}

export function saveOfflineProfileCache(
  patch: Partial<OfflineProfileCache>,
): OfflineProfileCache {
  const currentCache = getOfflineProfileCache();

  const nextCache: OfflineProfileCache = {
    ...currentCache,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  writeJson(OFFLINE_CACHE_KEY, nextCache);

  return nextCache;
}