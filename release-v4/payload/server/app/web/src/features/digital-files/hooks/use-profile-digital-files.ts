import { useQuery } from "@tanstack/react-query";

import { getDigitalFilesApi } from "@/features/digital-files/api";

export function useProfileDigitalFiles(profileId?: string | number | null) {
  return useQuery({
    queryKey: ["profile-digital-files", profileId],
    queryFn: () =>
      getDigitalFilesApi({
        profile: profileId as string | number,
        page: 1,
        page_size: 100,
      }),
    enabled: Boolean(profileId),
  });
}