import { useQuery } from "@tanstack/react-query";

import { getProfileByIdApi } from "@/features/profiles/api";

export function useProfileDetail(profileId?: string | number | null) {
  return useQuery({
    queryKey: ["profile-detail", profileId],
    queryFn: () => getProfileByIdApi(profileId as string | number),
    enabled: Boolean(profileId),
  });
}