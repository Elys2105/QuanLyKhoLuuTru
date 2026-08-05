"use client";

import { Download, RefreshCw, X } from "lucide-react";

import type { DigitalFile } from "@/features/digital-files/types";
import { SecurePdfFrame } from "@/features/digital-files/components/secure-pdf-frame";
import { getDigitalFileDisplayName } from "@/features/digital-files/utils/pdf-file-utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface PdfFullscreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: DigitalFile | null;
  objectUrl?: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onReload: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function PdfFullscreenDialog({
  open,
  onOpenChange,
  file,
  objectUrl,
  isLoading,
  errorMessage,
  onReload,
  onDownload,
  isDownloading,
}: PdfFullscreenDialogProps) {
  const title = getDigitalFileDisplayName(file);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[96vh] max-w-[96vw] overflow-hidden p-0">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <DialogTitle className="truncate text-base">
            {title}
          </DialogTitle>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReload}
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Tải lại
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={!file || isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Đang tải..." : "Tải"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Đóng</span>
            </Button>
          </div>
        </div>

        <div className="h-[calc(96vh-3.5rem)] overflow-hidden">
          <SecurePdfFrame
            title={title}
            objectUrl={objectUrl}
            isLoading={isLoading}
            errorMessage={errorMessage}
            heightClassName="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}