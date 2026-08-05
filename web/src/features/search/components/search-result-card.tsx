import Link from "next/link";
import {
  Archive,
  Box,
  Building2,
  FileArchive,
  FileText,
  FolderKanban,
  MapPinned,
} from "lucide-react";

import type {
  SearchDocumentMatch,
  SearchProfileResult,
} from "@/features/search/types";
import { fallbackText, formatFileSize, joinTextParts } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SearchResultCardProps {
  profile: SearchProfileResult;
}

function getDocumentMatches(profile: SearchProfileResult): SearchDocumentMatch[] {
  return (
    profile.matched_documents ||
    profile.document_matches ||
    profile.documents ||
    []
  );
}


function getSearchDocumentId(document: SearchDocumentMatch): string | number | null {
  const record = document as SearchDocumentMatch & {
    id?: string | number | null;
    document_id?: string | number | null;
  };

  return record.id ?? record.document_id ?? null;
}

function getStorageFileNumber(profile: SearchProfileResult): string | undefined {
  return profile.file_number || profile.storage_file_number;
}

function hasProfilePdf(profile: SearchProfileResult): boolean {
  return (
    Boolean(profile.has_pdf) ||
    Boolean(profile.pdf_preview_url) ||
    Boolean(profile.pdf_download_url) ||
    Boolean(profile.digital_files?.length)
  );
}

export function SearchResultCard({ profile }: SearchResultCardProps) {
  const documentMatches = getDocumentMatches(profile);
  const storageFileNumber = getStorageFileNumber(profile);
  const hasPdf = hasProfilePdf(profile);

  const locationText = joinTextParts([
    profile.warehouse_name || profile.warehouse_code,
    profile.location_name || profile.location_code,
  ]);

  const boxFileText = joinTextParts([
    profile.box_number ? `Hộp ${profile.box_number}` : null,
    storageFileNumber ? `Tệp ${storageFileNumber}` : null,
  ]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {fallbackText(profile.profile_code)}
              </Badge>

              {profile.year ? (
                <Badge variant="outline">
                  Năm {profile.year}
                </Badge>
              ) : null}

              <Badge variant={hasPdf ? "default" : "outline"}>
                {hasPdf ? "Có PDF" : "Chưa có PDF"}
              </Badge>

              {profile.match_type?.map((matchType) => (
                <Badge key={matchType} variant="outline">
                  {matchType}
                </Badge>
              ))}
            </div>

            <div>
              <h3 className="text-base font-semibold leading-6">
                  <Link
                    href={`/ho-so/${profile.id}`}
                    className="hover:underline"
                  >
                    {profile.title}
                  </Link>
                </h3>

              {profile.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {profile.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button asChild size="sm">
              <Link href={`/ho-so/${profile.id}`}>
                Chi tiết
              </Link>
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="flex gap-2">
            <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Phông</div>
              <div className="truncate">
                {joinTextParts([
                  profile.fond_code,
                  profile.fond_name,
                ])}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Mục lục</div>
              <div className="truncate">
                {joinTextParts([
                  profile.catalog_code,
                  profile.catalog_name,
                ])}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Kho / Vị trí</div>
              <div className="truncate">
                {locationText}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Box className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Hộp / Tệp</div>
              <div className="truncate">
                {boxFileText}
              </div>
            </div>
          </div>
        </div>

        {(profile.box_title || profile.storage_file_title) ? (
          <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            <MapPinned className="mr-2 inline h-4 w-4" />
            {joinTextParts([
              profile.box_title,
              profile.storage_file_title,
            ])}
          </div>
        ) : null}

        {documentMatches.length > 0 ? (
          <>
            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Tài liệu khớp
              </div>

              <div className="space-y-2">
                {documentMatches.slice(0, 3).map((document) => (
                  <div
                    key={document.id}
                    className="rounded-md border bg-muted/30 p-3 text-sm"
                  >
                    <div className="font-medium">
                        {document.id ? (
                          <Link
                            href={`/tai-lieu/${document.id}`}
                            className="hover:underline"
                          >
                            {document.title || document.document_title || "Bản ghi"}
                          </Link>
                        ) : (
                          document.title || document.document_title || "Bản ghi"
                        )}
                      </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {document.document_code || "Chưa có số ký hiệu"}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {joinTextParts([
                        document.document_date,
                        document.author,
                      ])}
                    </div>

                    {document.summary ? (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {document.summary}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {profile.digital_files && profile.digital_files.length > 0 ? (
          <>
            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileArchive className="h-4 w-4 text-muted-foreground" />
                File PDF
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.digital_files.slice(0, 5).map((file) => (
                  <Badge key={file.id} variant="outline">
                    {file.original_name}
                    {file.file_size ? ` · ${formatFileSize(file.file_size)}` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}