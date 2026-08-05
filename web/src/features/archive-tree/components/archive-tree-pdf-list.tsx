import { FileText } from "lucide-react";

import type { ArchiveTreeDigitalFile } from "@/features/archive-tree/types";
import { formatFileSize } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";

interface ArchiveTreePdfListProps {
  files: ArchiveTreeDigitalFile[];
}

export function ArchiveTreePdfList({
  files,
}: ArchiveTreePdfListProps) {
  if (files.length === 0) {
    return (
      <div className="ml-12 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Chưa có file PDF.
      </div>
    );
  }

  return (
    <div className="ml-12 space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />

          <span className="font-medium">
            {file.original_name}
          </span>

          {file.is_primary ? (
            <Badge>File chính</Badge>
          ) : (
            <Badge variant="outline">File phụ</Badge>
          )}

          <Badge variant="outline">
            {formatFileSize(file.file_size)}
          </Badge>

          {file.mime_type ? (
            <Badge variant="secondary">
              {file.mime_type}
            </Badge>
          ) : null}
        </div>
      ))}
    </div>
  );
}