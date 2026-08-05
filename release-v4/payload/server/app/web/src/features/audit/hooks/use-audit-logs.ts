import { useQuery } from "@tanstack/react-query";

import { getAuditLogsApi } from "@/features/audit/api";
import type { AuditLogFilters } from "@/features/audit/types";

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => getAuditLogsApi(filters),
  });
}