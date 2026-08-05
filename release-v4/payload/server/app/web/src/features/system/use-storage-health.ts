import { useQuery } from "@tanstack/react-query";

import { getStorageHealthApi } from "@/features/system/api";

export function useStorageHealth(scan = false) {
  return useQuery({
    queryKey: ["system-storage-health", scan],
    queryFn: () => getStorageHealthApi(scan),
    refetchInterval: 60_000,
  });
}