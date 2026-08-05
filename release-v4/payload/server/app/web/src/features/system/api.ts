import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type { StorageHealth } from "@/features/system/types";

function unwrapStorageHealth(
  data: StorageHealth | ApiResponse<StorageHealth>,
): StorageHealth {
  if (data && typeof data === "object" && "data" in data) {
    return data.data as StorageHealth;
  }

  return data as StorageHealth;
}

export async function getStorageHealthApi(
  scan = false,
): Promise<StorageHealth> {
  const response = await apiClient.get<
    StorageHealth | ApiResponse<StorageHealth>
  >("/api/system/storage/", {
    params: scan ? { scan: 1 } : undefined,
  });

  return unwrapStorageHealth(response.data);
}