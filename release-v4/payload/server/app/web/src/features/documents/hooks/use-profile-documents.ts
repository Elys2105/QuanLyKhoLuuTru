import { useQuery } from "@tanstack/react-query";

import { getDocumentsApi } from "@/features/documents/api";

export function useProfileDocuments(profileId?: string | number | null) {
  return useQuery({
    queryKey: ["profile-documents", profileId],
    queryFn: () =>
      getDocumentsApi({
        profile: profileId as string | number,
        page: 1,
        page_size: 100,
      }),
    enabled: Boolean(profileId),
  });
}