"use client";

import Link from "next/link";
import {
  Edit,
  Eye,
  Trash2,
} from "lucide-react";

import type { Document } from "@/features/documents/types";
import { fallbackText, formatDate } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DocumentsTableProps {
  documents: Document[];
  showProfileColumn?: boolean;
  onEdit?: (document: Document) => void;
  onDelete: (document: Document) => void;
  isDeleting?: boolean;
}

function getPageText(document: Document) {
  if (document.page_count) {
    return `${document.page_count} trang`;
  }

  const start = document.page_start ?? document.start_page ?? null;
  const end = document.page_end ?? document.end_page ?? null;

  if (!start && !end) return "-";

  return `${fallbackText(start)} - ${fallbackText(end)}`;
}

export function DocumentsTable(props: DocumentsTableProps) {
  const {
    documents,
    showProfileColumn = true,
    onDelete,
    isDeleting,
  } = props;

  if (documents.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Chưa có bản ghi.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1250px] text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="w-16 px-3 py-2 text-left font-medium">STT</th>
            <th className="px-3 py-2 text-left font-medium">Số/ký hiệu</th>
            <th className="px-3 py-2 text-left font-medium">Loại</th>
            <th className="px-3 py-2 text-left font-medium">Tên/trích yếu</th>
            <th className="px-3 py-2 text-left font-medium">Ngày</th>
            <th className="px-3 py-2 text-left font-medium">Tác giả</th>
            <th className="px-3 py-2 text-left font-medium">Người ký</th>
            <th className="px-3 py-2 text-left font-medium">Trang</th>
            {showProfileColumn ? (
              <th className="px-3 py-2 text-left font-medium">Hồ sơ</th>
            ) : null}
            <th className="px-3 py-2 text-left font-medium">File</th>
            <th className="w-64 px-3 py-2 text-right font-medium">Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {documents.map((document, index) => (
            <tr key={document.id} className="border-t">
              <td className="px-3 py-2">
                {document.order_in_profile || index + 1}
              </td>

              <td className="px-3 py-2">
                <Badge variant="secondary">
                  <Link
                    href={`/tai-lieu/${document.id}`}
                    className="font-medium hover:underline"
                    data-record-code-link
                  >
                    {document.document_code}
                  </Link>
                </Badge>
              </td>

              <td className="px-3 py-2">
                {fallbackText(document.document_type)}
              </td>

              <td className="px-3 py-2">
                <div className="font-medium">
                  <Link
                    href={`/tai-lieu/${document.id}`}
                    className="font-medium hover:underline"
                    data-record-title-link
                  >
                    {document.title}
                  </Link>
                </div>

                {document.summary ? (
                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {document.summary}
                  </div>
                ) : null}
              </td>

              <td className="px-3 py-2">
                {formatDate(document.document_date)}
              </td>

              <td className="px-3 py-2">
                {fallbackText(document.author)}
              </td>

              <td className="px-3 py-2">
                {fallbackText(document.signer)}
              </td>

              <td className="px-3 py-2">
                {getPageText(document)}
              </td>

              {showProfileColumn ? (
                <td className="px-3 py-2">
                  <div>{fallbackText(document.profile_code)}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {fallbackText(document.profile_title)}
                  </div>
                </td>
              ) : null}

              <td className="px-3 py-2">
                <Badge
                  variant={
                    document.digital_file_count
                      ? "default"
                      : "outline"
                  }
                >
                  {document.digital_file_count
                    ? `${document.digital_file_count} file`
                    : "Chưa có file"}
                </Badge>
              </td>

              <td className="px-3 py-2">
                <div className="flex justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/tai-lieu/${document.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Xem
                    </Link>
                  </Button>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/tai-lieu/${document.id}?mode=edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Sửa
                    </Link>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(document)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}