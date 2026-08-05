import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  downloadProfileImportTemplateApi,
  importProfilesExcelApi,
} from "@/features/imports/api";
import type { ProfileImportPayload } from "@/features/imports/types";
import { downloadBlobFile } from "@/features/imports/utils/import-utils";

export function useDownloadProfileImportTemplate() {
  return useMutation({
    mutationFn: downloadProfileImportTemplateApi,
    onSuccess: (blob) => {
      downloadBlobFile(blob, "mau_import_ho_so.xlsx");
    },
  });
}

export function useImportProfilesExcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileImportPayload) =>
      importProfilesExcelApi(payload),

    onSuccess: async (_result, variables) => {
      if (variables.dry_run) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["profiles"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["documents"],
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
    },
  });
}