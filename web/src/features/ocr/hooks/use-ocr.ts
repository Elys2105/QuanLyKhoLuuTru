import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteOcrForDigitalFileApi,
  getOcrJobsApi,
  getOcrProgressForDigitalFileApi,
  getOcrTextForDigitalFileApi,
  getOcrProfileSuggestionApi,
  runOcrForDigitalFileApi,
  searchOcrApi,
} from "@/features/ocr/api";

export function useOcrJobs() {
  return useQuery({
    queryKey: ["ocr-jobs"],
    queryFn: getOcrJobsApi,
  });
}

export function useOcrText(digitalFileId?: string | number | null) {
  return useQuery({
    queryKey: ["ocr-text", digitalFileId],
    queryFn: () => getOcrTextForDigitalFileApi(digitalFileId as string | number),
    enabled: Boolean(digitalFileId),
  });
}

export function useOcrProgress(digitalFileId?: string | number | null) {
  return useQuery({
    queryKey: ["ocr-progress", digitalFileId],
    queryFn: () => getOcrProgressForDigitalFileApi(digitalFileId as string | number),
    enabled: Boolean(digitalFileId),
    refetchInterval: (query) => {
      const jobs = query.state.data ?? [];
      const isRunning = jobs.some((job) =>
        ["PENDING", "RUNNING", "pending", "running"].includes(String(job.status)),
      );

      return isRunning ? 1500 : false;
    },
  });
}

export function useRunOcr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runOcrForDigitalFileApi,
    onSuccess: async (_result, digitalFileId) => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-progress", digitalFileId] });
      await queryClient.invalidateQueries({ queryKey: ["ocr-text", digitalFileId] });
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
    },
  });
}

export function useDeleteOcr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOcrForDigitalFileApi,
    onSuccess: async (_result, digitalFileId) => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-progress", digitalFileId] });
      await queryClient.invalidateQueries({ queryKey: ["ocr-text", digitalFileId] });
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
    },
  });
}

export function useOcrSearch() {
  return useMutation({
    mutationFn: searchOcrApi,
  });
}

export function useOcrProfileSuggestion(digitalFileId?: string | number | null) {
  return useQuery({
    queryKey: ["ocr", "profile-suggestion", digitalFileId],
    queryFn: () => getOcrProfileSuggestionApi(digitalFileId as string | number),
    enabled: Boolean(digitalFileId),
    retry: false,
  });
}
