import { useQuery } from "@tanstack/react-query";

import { getDashboardApi } from "@/features/dashboard/api";

export const DASHBOARD_QUERY_KEY = ["dashboard"];

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: getDashboardApi,
  });
}