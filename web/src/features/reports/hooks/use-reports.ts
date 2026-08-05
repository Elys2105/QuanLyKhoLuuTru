import { useMutation, useQuery } from "@tanstack/react-query";

import {
  exportProfilesReportApi,
  getDashboardReportApi,
} from "@/features/reports/api";
import type { ExportReportPayload } from "@/features/reports/types";

export function useDashboardReport() {
  return useQuery({
    queryKey: ["dashboard-report"],
    queryFn: getDashboardReportApi,
  });
}

export function useExportProfilesReport() {
  return useMutation({
    mutationFn: (payload: ExportReportPayload) =>
      exportProfilesReportApi(payload.format, payload.filters),
  });
}