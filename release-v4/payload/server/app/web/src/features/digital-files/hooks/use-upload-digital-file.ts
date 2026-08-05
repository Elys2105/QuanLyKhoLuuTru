import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadDigitalFileApi } from "@/features/digital-files/api";
import type {
  DigitalFile,
  DigitalFileUploadPayload,
} from "@/features/digital-files/types";

interface UseUploadDigitalFileOptions {
  profileId: string | number;
}

export function useUploadDigitalFile({
  profileId,
}: UseUploadDigitalFileOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DigitalFileUploadPayload) =>
      uploadDigitalFileApi(payload),

    onSuccess: async (uploadedFile: DigitalFile) => {
      await queryClient.invalidateQueries({
        queryKey: ["profile-digital-files", profileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["profile-detail", profileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });

      return uploadedFile;
    },
  });
}