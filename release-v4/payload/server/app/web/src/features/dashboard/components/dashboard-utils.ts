import type {
  DashboardData,
  DashboardLatestDigitalFile,
  DashboardLatestProfile,
  DashboardSummary,
} from "@/features/dashboard/types";

export function getSummaryValue(
  summary: DashboardSummary | undefined,
  keys: string[],
): number {
  if (!summary) return 0;

  for (const key of keys) {
    const value = summary[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return 0;
}

export function getLatestProfiles(
  dashboard?: DashboardData,
): DashboardLatestProfile[] {
  return (
    dashboard?.latest?.profiles ||
    dashboard?.latest?.latest_profiles ||
    []
  );
}

export function getLatestDigitalFiles(
  dashboard?: DashboardData,
): DashboardLatestDigitalFile[] {
  return (
    dashboard?.latest?.digital_files ||
    dashboard?.latest?.latest_digital_files ||
    []
  );
}