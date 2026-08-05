"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Expand,
  FileSpreadsheet,
  FileText,
  FileType2,
  RefreshCw,
} from "lucide-react";

import {
  getDigitalFileDownloadBlobApi,
} from "@/features/digital-files/api";
import { DigitalFileList } from "@/features/digital-files/components/digital-file-list";
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
  isExcelFile,
  isWordFile,
  sortDigitalFiles,
} from "@/features/digital-files/utils/pdf-file-utils";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatFileSize } from "@/lib/utils/format";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ProfilePdfViewerCardProps {
  digitalFiles: DigitalFile[];
}

function LargeFileIcon({ file }: { file: DigitalFile }) {
  if (isExcelFile(file)) {
    return <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />;
  }

  if (isWordFile(file)) {
    return <FileType2 className="mx-auto h-12 w-12 text-muted-foreground" />;
  }

  return <FileText className="mx-auto h-12 w-12 text-muted-foreground" />;
}

export function ProfilePdfViewerCard({
  digitalFiles,
}: ProfilePdfViewerCardProps) {
  const sortedFiles = useMemo(() => {
    return sortDigitalFiles(digitalFiles);
  }, [digitalFiles]);

  const [selectedFileId, setSelectedFileId] = useState<number | string | null>(
    null,
  );

  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (selectedFileId) return;

    const defaultFile = getDefaultDigitalFile(sortedFiles);

    if (defaultFile) {
      setSelectedFileId(defaultFile.id);
    }
  }, [selectedFileId, sortedFiles]);

  const selectedFile =
    sortedFiles.find((file) => String(file.id) === String(selectedFileId)) ||
    getDefaultDigitalFile(sortedFiles);

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
        getApiErrorMessage(
          error,
          "Không tải được file.",
        ),
      );
    } finally {
      setIsDownloading(false);
    }
  }

  function handleSelectFile(file: DigitalFile) {
    setSelectedFileId(file.id);
    setDownloadError(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <CardTitle>File đính kèm bản ghi</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF xem trước trực tiếp. Word/Excel được lưu an toàn và tải về khi cần.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={reload}
                disabled={!selectedFileCanPreview || isLoading}
              >
                <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                Tải lại
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFullscreenOpen(true)}
                disabled={!selectedFileCanPreview}
              >
                <Expand className="mr-2 h-4 w-4" />
                Toàn màn hình
              </Button>

              <Button
                type="button"
                onClick={handleDownload}
                disabled={!selectedFile || isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? "Đang tải..." : "Tải file"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {sortedFiles.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 font-medium">Chưa có file số hóa</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Hồ sơ này chưa được upload PDF, Word hoặc Excel.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">
                    Danh sách file
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Có {sortedFiles.length} file trong hồ sơ này.
                  </p>
                </div>

                <DigitalFileList
                  files={sortedFiles}
                  selectedFileId={selectedFile?.id}
                  onSelectFile={handleSelectFile}
                />
              </div>

              <div className="space-y-3">
                {selectedFile ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {getDigitalFileDisplayName(selectedFile)}
                    </Badge>

                    {selectedFile.is_primary ? (
                      <Badge>File chính</Badge>
                    ) : null}

                    <Badge variant="outline">
                      {getDigitalFileTypeLabel(selectedFile)}
                    </Badge>

                    <Badge variant="outline">
                      {formatFileSize(selectedFile.file_size)}
                    </Badge>

                    {selectedFile.mime_type ? (
                      <Badge variant="outline">
                        {selectedFile.mime_type}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                {downloadError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {downloadError}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Separator />

                {selectedFileCanPreview ? (
                  <div className="overflow-hidden rounded-md border bg-muted/30">
                    <SecurePdfFrame
                      title={getDigitalFileDisplayName(selectedFile)}
                      objectUrl={objectUrl}
                      isLoading={isLoading}
                      errorMessage={errorMessage}
                      heightClassName="h-[720px]"
                    />
                  </div>
                ) : selectedFile ? (
                  <div className="rounded-md border border-dashed p-10 text-center">
                    <LargeFileIcon file={selectedFile} />
                    <h3 className="mt-4 text-lg font-medium">
                      {getDigitalFileTypeLabel(selectedFile)} không xem trước trực tiếp
                    </h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                      File Word/Excel đã được lưu trong bản ghi. Để bảo đảm định dạng gốc, hãy tải file về máy để mở bằng Microsoft Word, Excel hoặc LibreOffice.
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
                ) : null}
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