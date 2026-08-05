"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  FileUp,
  Plus,
  RefreshCw,
} from "lucide-react";

import { useDocumentMutations } from "@/features/documents/hooks/use-documents";
import type { Document } from "@/features/documents/types";
import { uploadDigitalFileApi } from "@/features/digital-files/api";
import {
  isSupportedDigitalUploadFile,
  SUPPORTED_DIGITAL_FILE_ACCEPT,
} from "@/features/digital-files/utils/pdf-file-utils";
import { runOcrForDigitalFileApi } from "@/features/ocr/api";
import type { Profile } from "@/features/profiles/types";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

interface DocumentsManagerCardProps {
  title?: string;
  description?: string;
  documents: Document[];
  profiles?: Profile[];
  fixedProfileId?: string | number | null;
  isLoading?: boolean;
  headerExtra?: ReactNode;
  onRefresh?: () => void;
  onChanged?: () => void;
}

function asRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function getText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}


function getIdLike(value: unknown): string | number | null {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return null;
}

function getDocumentId(documentItem: Document) {
  return getText(asRecord(documentItem).id);
}

function getDocumentCode(documentItem: Document) {
  const item = asRecord(documentItem);

  return (
    getText(item.document_code) ||
    getText(item.record_code) ||
    getText(item.code) ||
    getText(item.document_identifier) ||
    getDocumentId(documentItem)
  );
}

function getDocumentTitle(documentItem: Document) {
  const item = asRecord(documentItem);

  return (
    getText(item.title) ||
    getText(item.name) ||
    getText(item.summary) ||
    getDocumentCode(documentItem) ||
    "Chưa có tiêu đề"
  );
}

function getDocumentDate(documentItem: Document) {
  const item = asRecord(documentItem);

  return (
    getText(item.document_date) ||
    getText(item.issued_date) ||
    getText(item.created_at) ||
    ""
  );
}

function getDocumentType(documentItem: Document) {
  const item = asRecord(documentItem);

  return (
    getText(item.document_type) ||
    getText(item.type) ||
    "Bản ghi"
  );
}

function getDocumentSummary(documentItem: Document) {
  const item = asRecord(documentItem);

  return (
    getText(item.summary) ||
    getText(item.description) ||
    getText(item.note) ||
    ""
  );
}

function removeFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

function makeDocumentCodeFromFileName(fileName: string) {
  const baseName = removeFileExtension(fileName);

  return (
    baseName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._/-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `PDF-${Date.now()}`
  );
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export function DocumentsManagerCard({
  title = "Bản ghi trong hồ sơ",
  description = "Danh sách bản ghi thuộc hồ sơ này.",
  documents,
  profiles: _profiles = [],
  fixedProfileId = null,
  isLoading = false,
  headerExtra,
  onRefresh,
  onChanged,
}: DocumentsManagerCardProps) {
  const documentsManagerUser = useAuthStore((state) => state.user) as {
    role?: unknown;
    is_superuser?: boolean;
  } | null;

  const documentsManagerRole = String(documentsManagerUser?.role ?? "")
    .trim()
    .toUpperCase();

  const canMutateDocumentsManager = Boolean(
    documentsManagerUser?.is_superuser || documentsManagerRole === "ADMIN",
  );

  const quickPdfInputRef = useRef<HTMLInputElement | null>(null);
  const [quickPdfError, setQuickPdfError] = useState<string | null>(null);
  const [quickPdfMessage, setQuickPdfMessage] = useState<string | null>(null);
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [manualActionError, setManualActionError] = useState<string | null>(null);

  const mutations = useDocumentMutations({
    profileId: fixedProfileId,
  });

  const createMutation = asRecord(mutations).createMutation as {
    mutateAsync?: (payload: unknown) => Promise<unknown>;
    isPending?: boolean;
  };

  const updateMutation = asRecord(mutations).updateMutation as {
    mutateAsync?: (payload: unknown) => Promise<unknown>;
    isPending?: boolean;
  };

  const deleteMutation = asRecord(mutations).deleteMutation as {
    mutateAsync?: (payload: unknown) => Promise<unknown>;
    isPending?: boolean;
  };

  const isMutating = Boolean(
    createMutation?.isPending ||
      updateMutation?.isPending ||
      deleteMutation?.isPending ||
      isQuickCreating,
  );

  function openQuickPdfPicker() {
    setQuickPdfError(null);
    setQuickPdfMessage(null);
    setManualActionError(null);
    quickPdfInputRef.current?.click();
  }

  async function handleOpenCreate() {
    setManualActionError(null);

    if (!fixedProfileId) {
      setManualActionError("Chưa có hồ sơ để thêm bản ghi.");
      return;
    }

    const documentCode = window.prompt("Nhập mã bản ghi:");
    if (!documentCode?.trim()) return;

    const titleValue = window.prompt("Nhập tiêu đề bản ghi:", documentCode.trim());
    if (titleValue === null) return;

    try {
      await createMutation?.mutateAsync?.({
        profile: fixedProfileId,
        document_code: documentCode.trim(),
        title: titleValue.trim() || documentCode.trim(),
        language: "Tiếng Việt",
      });

      onChanged?.();
    } catch (error) {
      setManualActionError(
        getApiErrorMessage(error, "Thêm bản ghi thất bại. Vui lòng thử lại."),
      );
    }
  }

  async function handleOpenEdit(documentItem: Document) {
    setManualActionError(null);

    const documentId = getDocumentId(documentItem);
    if (!documentId) {
      setManualActionError("Không xác định được mã hệ thống của bản ghi.");
      return;
    }

    const currentTitle = getDocumentTitle(documentItem);
    const nextTitle = window.prompt("Sửa tiêu đề bản ghi:", currentTitle);

    if (nextTitle === null) return;

    try {
      await updateMutation?.mutateAsync?.({
        id: documentId,
        payload: {
          title: nextTitle.trim() || currentTitle,
        },
      });

      onChanged?.();
    } catch (error) {
      setManualActionError(
        getApiErrorMessage(error, "Sửa bản ghi thất bại. Vui lòng thử lại."),
      );
    }
  }

  async function handleDeleteDocument(documentItem: Document) {
    setManualActionError(null);

    const documentId = getDocumentId(documentItem);
    const documentTitle = getDocumentTitle(documentItem);

    if (!documentId) {
      setManualActionError("Không xác định được mã hệ thống của bản ghi.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bản ghi "${documentTitle}" không?`,
    );

    if (!confirmed) return;

    try {
      await deleteMutation?.mutateAsync?.(documentId);
      onChanged?.();
    } catch (error) {
      setManualActionError(
        getApiErrorMessage(error, "Xóa bản ghi thất bại. Vui lòng thử lại."),
      );
    }
  }

  async function handleQuickPdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    setQuickPdfError(null);
    setQuickPdfMessage(null);
    setManualActionError(null);

    if (!file) return;

    if (!fixedProfileId) {
      setQuickPdfError("Chưa có hồ sơ để tạo bản ghi từ PDF.");
      return;
    }

    if (!isSupportedDigitalUploadFile(file)) {
      setQuickPdfError(
        "Chỉ được chọn file PDF, Word hoặc Excel. Tạo nhanh ưu tiên dùng PDF.",
      );
      return;
    }

    setIsQuickCreating(true);

    try {
      const titleFromFile = removeFileExtension(file.name);
      const documentCode = makeDocumentCodeFromFileName(file.name);

      const createdDocument = await createMutation?.mutateAsync?.({
        profile: fixedProfileId,
        document_code: documentCode,
        title: titleFromFile,
        summary: `Tạo nhanh từ file: ${file.name}`,
        language: "Tiếng Việt",
      });

      const created = asRecord(createdDocument);
      const createdDocumentId = getText(created.id);
      const createdProfile =
        getIdLike(created.profile) ??
        getIdLike(created.profile_id) ??
        getIdLike(fixedProfileId);

      if (!createdDocumentId) {
        throw new Error("Tạo bản ghi thành công nhưng không nhận được mã bản ghi.");
      }

      if (createdProfile === null) {
        throw new Error("Tạo bản ghi thành công nhưng không nhận được mã hồ sơ.");
      }

      const uploadResponse = await uploadDigitalFileApi({
        profile: createdProfile,
        document: createdDocumentId,
        file,
        is_primary: true,
      });

      const uploadedFile = asRecord(
        asRecord(uploadResponse).data ?? uploadResponse,
      );

      const uploadedFileId = Number(uploadedFile.id);

      if (!Number.isFinite(uploadedFileId)) {
        throw new Error("Upload file thành công nhưng không nhận được mã file số hóa.");
      }

      if (isPdfFile(file)) {
        await runOcrForDigitalFileApi(uploadedFileId);
        setQuickPdfMessage(
          `Đã tạo bản ghi "${titleFromFile}", upload PDF và bắt đầu OCR nhanh.`,
        );
      } else {
        setQuickPdfMessage(
          `Đã tạo bản ghi "${titleFromFile}" và upload file vào bản ghi.`,
        );
      }

      onChanged?.();
    } catch (error) {
      setQuickPdfError(
        getApiErrorMessage(
          error,
          "Tạo nhanh bản ghi từ file thất bại. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsQuickCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading || isMutating}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới
            </Button>

            {canMutateDocumentsManager ? (
              <>
                <input
                  ref={quickPdfInputRef}
                  type="file"
                  className="hidden"
                  accept={SUPPORTED_DIGITAL_FILE_ACCEPT}
                  onChange={handleQuickPdfChange}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={openQuickPdfPicker}
                  disabled={!fixedProfileId || isQuickCreating}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {isQuickCreating ? "Đang tạo..." : "Tạo nhanh từ PDF"}
                </Button>

                <Button
                  type="button"
                  onClick={handleOpenCreate}
                  disabled={!fixedProfileId || isMutating}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm bản ghi
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {headerExtra ? <div>{headerExtra}</div> : null}

        {quickPdfError ? (
          <Alert variant="destructive">
            <AlertDescription>{quickPdfError}</AlertDescription>
          </Alert>
        ) : null}

        {manualActionError ? (
          <Alert variant="destructive">
            <AlertDescription>{manualActionError}</AlertDescription>
          </Alert>
        ) : null}

        {quickPdfMessage ? (
          <Alert>
            <AlertDescription>{quickPdfMessage}</AlertDescription>
          </Alert>
        ) : null}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Chưa có bản ghi nào trong hồ sơ này.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Mã bản ghi</th>
                  <th className="px-3 py-2 font-medium">Tiêu đề</th>
                  <th className="px-3 py-2 font-medium">Loại</th>
                  <th className="px-3 py-2 font-medium">Ngày</th>
                  <th className="px-3 py-2 font-medium">Tóm tắt</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {documents.map((documentItem, index) => {
                  const documentId = getDocumentId(documentItem);
                  const documentCode = getDocumentCode(documentItem);
                  const documentTitle = getDocumentTitle(documentItem);
                  const documentType = getDocumentType(documentItem);
                  const documentDate = getDocumentDate(documentItem);
                  const documentSummary = getDocumentSummary(documentItem);

                  return (
                    <tr
                      key={documentId || `${documentCode}-${index}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-2 align-top font-medium">
                        {documentId ? (
                          <Link
                            href={`/tai-lieu/${documentId}`}
                            className="text-primary hover:underline"
                          >
                            {documentCode}
                          </Link>
                        ) : (
                          documentCode
                        )}
                      </td>

                      <td className="px-3 py-2 align-top">
                        {documentId ? (
                          <Link
                            href={`/tai-lieu/${documentId}`}
                            className="text-primary hover:underline"
                          >
                            {documentTitle}
                          </Link>
                        ) : (
                          documentTitle
                        )}
                      </td>

                      <td className="px-3 py-2 align-top">
                        <Badge variant="secondary">{documentType}</Badge>
                      </td>

                      <td className="px-3 py-2 align-top">
                        {documentDate || "—"}
                      </td>

                      <td className="max-w-xs px-3 py-2 align-top text-muted-foreground">
                        {documentSummary || "—"}
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="flex justify-end gap-2">
                          {canMutateDocumentsManager ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(documentItem)}
                                disabled={isMutating}
                              >
                                Sửa
                              </Button>

                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteDocument(documentItem)}
                                disabled={isMutating}
                              >
                                Xóa
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Chỉ xem
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}