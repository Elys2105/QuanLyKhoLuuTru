"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Expand,
  FileText,
  RefreshCw,
} from "lucide-react";

import {
  getDigitalFileDownloadBlobApi,
} from "@/features/digital-files/api";
import { PdfFullscreenDialog } from "@/features/digital-files/components/pdf-fullscreen-dialog";
import { SecurePdfFrame } from "@/features/digital-files/components/secure-pdf-frame";
import { useDigitalFilePreviewUrl } from "@/features/digital-files/hooks/use-digital-file-preview-url";
import type { DigitalFile } from "@/features/digital-files/types";
import {
  canPreviewDigitalFile,
  downloadBlob,
  getDefaultDigitalFile,
  getDigitalFileDisplayName,
  getDigitalFileTypeLabel,
} from "@/features/digital-files/utils/pdf-file-utils";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatFileSize } from "@/lib/utils/format";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface RecordPdfPreviewCardProps {
  digitalFiles: DigitalFile[];
}

export function RecordPdfPreviewCard({
  digitalFiles,
}: RecordPdfPreviewCardProps) {
  const selectedFile = useMemo(() => {
    const defaultFile = getDefaultDigitalFile(digitalFiles);

    if (defaultFile) return defaultFile;

    return digitalFiles.find((file) => canPreviewDigitalFile(file)) ?? digitalFiles[0] ?? null;
  }, [digitalFiles]);

  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedFileCanPreview = canPreviewDigitalFile(selectedFile);

  const {
    objectUrl,
    isLoading,
    errorMessage,
    reload,
  } = useDigitalFilePreviewUrl(
    selectedFileCanPreview ? selectedFile?.id : undefined,
  );

  async function handleDownload() {
    if (!selectedFile) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const blob = await getDigitalFileDownloadBlobApi(selectedFile.id);
      downloadBlob(blob, getDigitalFileDisplayName(selectedFile));
    } catch (error) {
      setDownloadError(
        getApiErrorMessage(error, "Không tải được file. Vui lòng thử lại."),
      );
    } finally {
      setIsDownloading(false);
    }
  }

  if (digitalFiles.length === 0 || !selectedFile) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Bản ghi này chưa có file PDF/Word/Excel.
          </div>
        </CardContent>
      </Card>
    );
  }

  const fileSize = selectedFile.file_size
    ? formatFileSize(selectedFile.file_size)
    : null;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

              <div className="truncate text-sm font-semibold">
                {getDigitalFileDisplayName(selectedFile)}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {selectedFile.is_primary ? (
                <Badge>File chính</Badge>
              ) : null}

              <Badge variant="outline">
                {getDigitalFileTypeLabel(selectedFile)}
              </Badge>

              {fileSize ? (
                <Badge variant="outline">
                  {fileSize}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={reload}
              disabled={isLoading || !selectedFileCanPreview}
            >
              <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Tải lại
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreenOpen(true)}
              disabled={!selectedFileCanPreview}
            >
              <Expand className="mr-2 h-4 w-4" />
              Toàn màn hình
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Đang tải..." : "Tải file"}
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {downloadError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>{downloadError}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {selectedFileCanPreview ? (
            <SecurePdfFrame
              title={getDigitalFileDisplayName(selectedFile)}
              objectUrl={objectUrl}
              isLoading={isLoading}
              errorMessage={errorMessage}
              heightClassName="h-[calc(100vh-250px)] min-h-[760px]"
            />
          ) : (
            <div className="flex min-h-[520px] items-center justify-center p-8">
              <div className="max-w-md text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-base font-semibold">
                  File này không xem trước trực tiếp được
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Word/Excel được lưu trong hệ thống. Hãy tải file về máy để mở bằng Word, Excel hoặc LibreOffice.
                </p>

                <Button
                  type="button"
                  className="mt-5"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading ? "Đang tải..." : "Tải file"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PdfFullscreenDialog
        open={isFullscreenOpen}
        onOpenChange={setIsFullscreenOpen}
        file={selectedFileCanPreview ? selectedFile : null}
        objectUrl={objectUrl}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onReload={reload}
        onDownload={handleDownload}
        isDownloading={isDownloading}
      />
    </>
  );
}