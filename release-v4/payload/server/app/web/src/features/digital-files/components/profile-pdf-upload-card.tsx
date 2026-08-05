"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  FileSpreadsheet,
  FileText,
  FileType2,
  UploadCloud,
} from "lucide-react";

import type { Document } from "@/features/documents/types";
import { useUploadDigitalFile } from "@/features/digital-files/hooks/use-upload-digital-file";
import type { DigitalFile } from "@/features/digital-files/types";
import {
  getBrowserFileKind,
  isSupportedDigitalUploadFile,
  SUPPORTED_DIGITAL_FILE_ACCEPT,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfilePdfUploadCardProps {
  profileId: string | number;
  documents: Document[];
  onUploaded?: (file: DigitalFile) => void;
}

function getSelectedFileLabel(file: File): string {
  const kind = getBrowserFileKind(file);

  if (kind === "pdf") return "PDF";
  if (kind === "word") return "Word";
  if (kind === "excel") return "Excel";

  return "Không rõ";
}

function SelectedFileIcon({ file }: { file: File }) {
  const kind = getBrowserFileKind(file);

  if (kind === "excel") {
    return <FileSpreadsheet className="h-4 w-4" />;
  }

  if (kind === "word") {
    return <FileType2 className="h-4 w-4" />;
  }

  return <FileText className="h-4 w-4" />;
}

export function ProfilePdfUploadCard({
  profileId,
  documents,
  onUploaded,
}: ProfilePdfUploadCardProps) {
  const uploadMutation = useUploadDigitalFile({ profileId });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState("none");
  const [isPrimary, setIsPrimary] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedDocument = useMemo(() => {
    if (selectedDocumentId === "none") return null;

    return documents.find(
      (document) => String(document.id) === selectedDocumentId,
    ) ?? null;
  }, [documents, selectedDocumentId]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setFormError(null);
    setSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isSupportedDigitalUploadFile(file)) {
      setSelectedFile(null);
      setFormError(
        "Chỉ được chọn file PDF, Word hoặc Excel: .pdf, .doc, .docx, .xls, .xlsx.",
      );
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError(null);
    setSuccessMessage(null);

    if (!selectedFile) {
      setFormError("Vui lòng chọn file PDF, Word hoặc Excel cần upload.");
      return;
    }

    try {
      const uploadedFile = await uploadMutation.mutateAsync({
        profile: profileId,
        document:
          selectedDocumentId === "none"
            ? null
            : selectedDocumentId,
        file: selectedFile,
        is_primary: isPrimary,
      });

      setSuccessMessage(
        `Upload thành công: ${uploadedFile.original_name}`,
      );

      setSelectedFile(null);
      setSelectedDocumentId("none");
      setIsPrimary(false);
      setFileInputKey((current) => current + 1);

      onUploaded?.(uploadedFile);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "Upload file thất bại. Vui lòng thử lại.",
        ),
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload file vào hồ sơ</CardTitle>
        <p className="text-sm text-muted-foreground">
          Hỗ trợ PDF, Word và Excel. File sẽ được gửi bằng FormData multipart lên backend.
        </p>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {formError}
              </AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert>
              <AlertDescription>
                {successMessage}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pdf-file">Chọn file PDF/Word/Excel</Label>
              <Input
                key={fileInputKey}
                id="pdf-file"
                type="file"
                accept={SUPPORTED_DIGITAL_FILE_ACCEPT}
                onChange={handleFileChange}
                disabled={uploadMutation.isPending}
              />

              {selectedFile ? (
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <SelectedFileIcon file={selectedFile} />
                    {selectedFile.name}
                  </Badge>

                  <Badge variant="outline">
                    {getSelectedFileLabel(selectedFile)}
                  </Badge>

                  <Badge variant="outline">
                    {formatFileSize(selectedFile.size)}
                  </Badge>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Chọn .pdf, .doc, .docx, .xls hoặc .xlsx. File thật không lưu trong JSON.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Gắn với tài liệu</Label>
              <Select
                value={selectedDocumentId}
                onValueChange={setSelectedDocumentId}
                disabled={uploadMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài liệu" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">
                    Không gắn tài liệu cụ thể
                  </SelectItem>

                  {documents.map((document) => (
                    <SelectItem
                      key={document.id}
                      value={String(document.id)}
                    >
                      {document.document_code} - {document.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDocument ? (
                <p className="text-xs text-muted-foreground">
                  File sẽ được gắn với tài liệu: {selectedDocument.title}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nếu không chọn, file chỉ gắn với hồ sơ hiện tại.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="is-primary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked === true)}
              disabled={uploadMutation.isPending}
            />

            <div className="space-y-1">
              <Label htmlFor="is-primary">
                Đặt làm file chính của hồ sơ
              </Label>
              <p className="text-xs text-muted-foreground">
                File chính sẽ được ưu tiên hiển thị trước trong danh sách file số hóa.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={uploadMutation.isPending}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? "Đang upload..." : "Upload file"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}