import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProfileApi,
  deleteProfileApi,
  getProfilesApi,
  updateProfileApi,
} from "@/features/profiles/api";
import type {
  ProfilePayload,
  ProfileQueryParams,
} from "@/features/profiles/types";

export const PROFILES_QUERY_KEY = ["profiles"];

export function useProfiles(params?: ProfileQueryParams) {
  return useQuery({
    queryKey: [PROFILES_QUERY_KEY, params],
    queryFn: () => getProfilesApi(params),
  });
}

export function useProfileMutations() {
  const queryClient = useQueryClient();

  const invalidateRelatedQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: PROFILES_QUERY_KEY,
    });

    await queryClient.invalidateQueries({
      queryKey: ["search-profiles"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["archive-tree"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["dashboard"],
    });
  };

  const createMutation = useMutation({
    mutationFn: createProfileApi,
    onSuccess: invalidateRelatedQueries,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Partial<ProfilePayload>;
    }) => updateProfileApi(id, payload),
    onSuccess: invalidateRelatedQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProfileApi,
    onSuccess: invalidateRelatedQueries,
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}