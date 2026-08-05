"use client";

import {
  FileText,
  Loader2,
  UploadCloud,
  Wand2,
} from "lucide-react";
import {
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  uploadDigitalFileApi,
} from "@/features/digital-files/api";
import type { DigitalFile } from "@/features/digital-files/types";
import { runOcrForDigitalFileApi } from "@/features/ocr/api";
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

interface RecordFileUploadPanelProps {
  profileId?: string | number | null;
  documentId?: string | number | null;
  onUploaded?: (file: DigitalFile) => void | Promise<void>;
}

function normalizeId(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();

    return text ? value : null;
  }

  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: string | number | null }).id;

    return id ?? null;
  }

  return null;
}

function isPdfUpload(file?: File | null) {
  if (!file) return false;

  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getFileKindLabel(file?: File | null) {
  if (!file) return "Chưa chọn";

  const name = file.name.toLowerCase();

  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "Word";
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "Excel";

  return file.type || "File";
}

function unwrapApiData<T>(value: T | { data?: T }): T {
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    (value as { data?: T }).data
  ) {
    return (value as { data: T }).data;
  }

  return value as T;
}

export function RecordFileUploadPanel({
  profileId,
  documentId,
  onUploaded,
}: RecordFileUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPrimary, setIsPrimary] = useState(true);
  const [runOcrAfterUpload, setRunOcrAfterUpload] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const safeProfileId = normalizeId(profileId);
  const safeDocumentId = normalizeId(documentId);
  const canUpload = Boolean(safeProfileId && safeDocumentId && selectedFile && !isUploading);
  const isPdf = isPdfUpload(selectedFile);

  async function invalidateRecordQueries(uploadedFile?: DigitalFile) {
    await queryClient.invalidateQueries({
      queryKey: ["record-detail", safeDocumentId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["record-digital-files"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["profile-digital-files", safeProfileId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["ocr-jobs"],
    });

    if (uploadedFile) {
      await onUploaded?.(uploadedFile);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage("Hãy chọn file PDF/Word/Excel trước.");
      return;
    }

    if (!safeProfileId || !safeDocumentId) {
      setErrorMessage(
        `Thiếu ID hồ sơ hoặc ID bản ghi. profile=${String(profileId)}, document=${String(documentId)}`,
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setSuccessMessage(null);

    let uploadedFile: DigitalFile | null = null;
    let uploadedFileId: number | null = null;

    try {
      const uploadResponse = await uploadDigitalFileApi({
        profile: safeProfileId,
        document: safeDocumentId,
        file: selectedFile,
        is_primary: isPrimary,
      });

      uploadedFile = unwrapApiData<DigitalFile>(uploadResponse);
      uploadedFileId = Number(uploadedFile?.id);

      if (!Number.isFinite(uploadedFileId) || uploadedFileId <= 0) {
        throw new Error("Upload file thành công nhưng không nhận được mã file số hóa.");
      }

      setSuccessMessage(
        `Đã upload file vào bản ghi: ${uploadedFile.original_name || selectedFile.name}`,
      );

      await invalidateRecordQueries(uploadedFile);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "Upload file vào bản ghi thất bại. Kiểm tra lại quyền, dung lượng, định dạng file hoặc giới hạn upload.",
        ),
      );
      return;
    } finally {
      setIsUploading(false);
    }

    if (uploadedFile && uploadedFileId && runOcrAfterUpload && isPdf) {
      setIsUploading(true);

      try {
        await runOcrForDigitalFileApi(uploadedFileId);

        setSuccessMessage(
          `Đã upload file vào bản ghi và đã gửi OCR: ${uploadedFile.original_name || selectedFile.name}`,
        );

        await invalidateRecordQueries(uploadedFile);
      } catch (error) {
        setWarningMessage(
          getApiErrorMessage(
            error,
            "File đã upload vào bản ghi, nhưng chạy OCR sau upload thất bại. Có thể chạy OCR lại sau.",
          ),
        );

        await invalidateRecordQueries(uploadedFile);
      } finally {
        setIsUploading(false);
      }
    }

    setSelectedFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <Card className="rounded-none border-0 shadow-none">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">
          File đính kèm bản ghi
        </CardTitle>
        <p className="text-xs leading-5 text-muted-foreground">
          Chọn PDF/Word/Excel từ máy. File sẽ gắn trực tiếp vào bản ghi này, không gắn lỏng vào hồ sơ.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {warningMessage ? (
          <Alert>
            <AlertDescription>{warningMessage}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Chọn file PDF/Word/Excel
          </label>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="w-full rounded-md border px-3 py-2 text-sm"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setErrorMessage(null);
              setWarningMessage(null);
              setSuccessMessage(null);
            }}
          />

          {selectedFile ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="max-w-full truncate">
                <FileText className="mr-1 h-3 w-3" />
                {selectedFile.name}
              </Badge>
              <Badge variant="outline">
                {getFileKindLabel(selectedFile)}
              </Badge>
              <Badge variant="outline">
                {formatFileSize(selectedFile.size)}
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            <span>
              <span className="block font-medium">Đặt làm file chính</span>
              <span className="block text-xs leading-5 text-muted-foreground">
                File chính được ưu tiên hiển thị trước trong bản ghi.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={runOcrAfterUpload}
              onChange={(event) => setRunOcrAfterUpload(event.target.checked)}
              disabled={!isPdf}
            />
            <span>
              <span className="flex items-center gap-1 font-medium">
                <Wand2 className="h-4 w-4" />
                Chạy OCR sau khi upload PDF
              </span>
              <span className="block text-xs leading-5 text-muted-foreground">
                Chỉ áp dụng cho PDF. Nếu OCR lỗi, file vẫn được giữ trong bản ghi.
              </span>
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isUploading ? "Đang xử lý..." : "Upload vào bản ghi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}