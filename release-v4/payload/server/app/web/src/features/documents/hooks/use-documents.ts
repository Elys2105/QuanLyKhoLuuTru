import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDocumentApi,
  deleteDocumentApi,
  getDocumentsListApi,
  updateDocumentApi,
} from "@/features/documents/api";
import type {
  DocumentPayload,
  DocumentQueryParams,
} from "@/features/documents/types";

export const DOCUMENTS_QUERY_KEY = ["documents"];

export function useDocuments(params?: DocumentQueryParams) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, params],
    queryFn: () => getDocumentsListApi(params),
  });
}

interface UseDocumentMutationsOptions {
  profileId?: string | number | null;
}

export function useDocumentMutations({
  profileId,
}: UseDocumentMutationsOptions = {}) {
  const queryClient = useQueryClient();

  const invalidateRelatedQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: DOCUMENTS_QUERY_KEY,
    });

    if (profileId) {
      await queryClient.invalidateQueries({
        queryKey: ["profile-documents", profileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["profile-detail", profileId],
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ["profiles"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["search-profiles"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["dashboard"],
    });
  };

  const createMutation = useMutation({
    mutationFn: createDocumentApi,
    onSuccess: invalidateRelatedQueries,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Partial<DocumentPayload>;
    }) => updateDocumentApi(id, payload),
    onSuccess: invalidateRelatedQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentApi,
    onSuccess: invalidateRelatedQueries,
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}