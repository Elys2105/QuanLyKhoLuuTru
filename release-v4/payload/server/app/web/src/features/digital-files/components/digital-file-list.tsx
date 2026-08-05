"use client";

import { CheckCircle2, FileSpreadsheet, FileText, FileType2 } from "lucide-react";

import type { DigitalFile } from "@/features/digital-files/types";
import {
  canPreviewDigitalFile,
  getDigitalFileDisplayName,
  getDigitalFileTypeLabel,
  isExcelFile,
  isPdfFile,
  isWordFile,
  sortDigitalFiles,
} from "@/features/digital-files/utils/pdf-file-utils";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DigitalFileListProps {
  files: DigitalFile[];
  selectedFileId?: number | string | null;
  onSelectFile: (file: DigitalFile) => void;
}

function FileKindIcon({ file }: { file: DigitalFile }) {
  if (isExcelFile(file)) {
    return <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }

  if (isWordFile(file)) {
    return <FileType2 className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }

  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function DigitalFileList({
  files,
  selectedFileId,
  onSelectFile,
}: DigitalFileListProps) {
  const sortedFiles = sortDigitalFiles(files);

  if (sortedFiles.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-5 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Hồ sơ này chưa có file số hóa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedFiles.map((file) => {
        const selected = String(file.id) === String(selectedFileId);
        const displayName = getDigitalFileDisplayName(file);
        const canPreview = canPreviewDigitalFile(file);

        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onSelectFile(file)}
            className={cn(
              "w-full rounded-md border p-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileKindIcon file={file} />

                  <div className="truncate text-sm font-medium">
                    {displayName}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {file.is_primary ? (
                    <Badge>File chính</Badge>
                  ) : (
                    <Badge variant="outline">File phụ</Badge>
                  )}

                  <Badge variant={isPdfFile(file) ? "secondary" : "outline"}>
                    {getDigitalFileTypeLabel(file)}
                  </Badge>

                  <Badge variant={canPreview ? "secondary" : "outline"}>
                    {canPreview ? "Xem trước" : "Tải về"}
                  </Badge>

                  <Badge variant="outline">
                    {formatFileSize(file.file_size)}
                  </Badge>
                </div>
              </div>

              {selected ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              ) : null}
            </div>
          </button>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full"
        onClick={() => {
          const primaryFile = sortedFiles.find((file) => file.is_primary);
          onSelectFile(primaryFile || sortedFiles[0]);
        }}
      >
        Chọn file chính
      </Button>
    </div>
  );
}