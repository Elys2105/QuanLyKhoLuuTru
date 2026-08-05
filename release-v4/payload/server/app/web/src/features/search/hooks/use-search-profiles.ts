import { useQuery } from "@tanstack/react-query";

import { searchProfilesApi } from "@/features/search/api";
import type { SearchProfileParams } from "@/features/search/types";

export const SEARCH_PROFILES_QUERY_KEY = ["search-profiles"];

function hasAnySearchValue(params: SearchProfileParams): boolean {
  return Object.values(params).some((value) => {
    return value !== undefined && value !== null && value !== "";
  });
}

export function useSearchProfiles(
  params: SearchProfileParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [SEARCH_PROFILES_QUERY_KEY, params],
    queryFn: () => searchProfilesApi(params),
    enabled: enabled && hasAnySearchValue(params),
  });
}