import type { Document } from "@/features/documents/types";
import { fallbackText, formatDate } from "@/lib/utils/format";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProfileDocumentsCardProps {
  documents: Document[];
}

function getStartPage(document: Document) {
  return document.start_page ?? document.page_start ?? null;
}

function getEndPage(document: Document) {
  return document.end_page ?? document.page_end ?? null;
}

export function ProfileDocumentsCard({
  documents,
}: ProfileDocumentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Thành phần tài liệu ({documents.length})
        </CardTitle>
      </CardHeader>

      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hồ sơ này chưa có thành phần tài liệu.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="rounded-md border p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {document.title}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {fallbackText(document.document_code)}
                    </div>
                  </div>

                  <Badge variant="outline">
                    {formatDate(document.document_date)}
                  </Badge>
                </div>

                <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <div>Tác giả: {fallbackText(document.author)}</div>
                  <div>
                    Trang: {fallbackText(getStartPage(document))} - {fallbackText(getEndPage(document))}
                  </div>
                  <div>PDF: {document.digital_file_count ?? 0}</div>
                </div>

                {document.summary ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {document.summary}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}