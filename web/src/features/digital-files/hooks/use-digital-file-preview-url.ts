import { useCallback, useEffect, useState } from "react";

import { getDigitalFilePreviewBlobApi } from "@/features/digital-files/api";
import {
  createBlobObjectUrl,
  revokeBlobObjectUrl,
} from "@/features/digital-files/utils/pdf-file-utils";
import { getApiErrorMessage } from "@/lib/api/client";

export function useDigitalFilePreviewUrl(
  digitalFileId?: string | number | null,
) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    setObjectUrl((currentUrl) => {
      revokeBlobObjectUrl(currentUrl);
      return null;
    });

    async function loadPreview() {
      if (!digitalFileId) {
        setIsLoading(false);
        setErrorMessage(null);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const blob = await getDigitalFilePreviewBlobApi(digitalFileId);

        if (cancelled) return;

        createdObjectUrl = createBlobObjectUrl(blob);
        setObjectUrl(createdObjectUrl);
      } catch (error) {
        if (cancelled) return;

        setErrorMessage(
          getApiErrorMessage(
            error,
            "Không tải được file PDF để xem trước.",
          ),
        );
        setObjectUrl(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
      revokeBlobObjectUrl(createdObjectUrl);
    };
  }, [digitalFileId, reloadKey]);

  return {
    objectUrl,
    isLoading,
    errorMessage,
    reload,
  };
}