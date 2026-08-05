"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, RefreshCw, Save, Wand2 } from "lucide-react";

import type { DigitalFile } from "@/features/digital-files/types";
import {
  canPreviewDigitalFile,
  getDigitalFileDisplayName,
} from "@/features/digital-files/utils/pdf-file-utils";
import {
  getCatalogsApi,
  getStorageFilesApi,
} from "@/features/master-data/api";
import type {
  Catalog,
  StorageFile,
} from "@/features/master-data/types";
import { useOcrProfileSuggestion } from "@/features/ocr/hooks/use-ocr";
import type { Profile, ProfilePayload } from "@/features/profiles/types";
import { useProfileMutations } from "@/features/profiles/hooks/use-profiles";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface OcrProfileSuggestionCardProps {
  profile: Profile;
  digitalFiles: DigitalFile[];
}

interface SuggestionFormValues {
  catalog: string;
  storage_file: string;
  profile_code: string;
  title: string;
  description: string;
  year: string;
  total_pages: string;
  retention_period: string;
  language: string;
  notes: string;
}

const EMPTY_VALUES: SuggestionFormValues = {
  catalog: "",
  storage_file: "",
  profile_code: "",
  title: "",
  description: "",
  year: "",
  total_pages: "",
  retention_period: "Vĩnh viễn",
  language: "Tiếng Việt",
  notes: "",
};

function readText(item: unknown, keys: string[]): string {
  if (!item || typeof item !== "object") return "";

  const record = item as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return "";
}

function getCatalogLabel(catalog: Catalog): string {
  const code = readText(catalog, ["code", "catalog_code"]);
  const name = readText(catalog, ["name", "catalog_name", "title"]);
  const fond = readText(catalog, ["fond_code", "fond_name"]);

  return [fond, [code, name].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(" / ") || `Mục lục #${catalog.id}`;
}

function getStorageFileLabel(storageFile: StorageFile): string {
  const fileNumber = readText(storageFile, [
    "file_number",
    "storage_file_number",
    "number",
    "code",
  ]);
  const title = readText(storageFile, [
    "title",
    "storage_file_title",
    "name",
  ]);
  const box = readText(storageFile, ["box_number", "storage_box_number"]);

  return [
    box ? `Hộp ${box}` : "",
    [fileNumber, title].filter(Boolean).join(" - ") || `Tệp #${storageFile.id}`,
  ]
    .filter(Boolean)
    .join(" / ");
}

function parseOptionalNumber(label: string, value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} phải là số.`);
  }

  return parsed;
}

function buildPayload(values: SuggestionFormValues): ProfilePayload {
  const catalog = values.catalog.trim();
  const storageFile = values.storage_file.trim();
  const profileCode = values.profile_code.trim();
  const title = values.title.trim();

  if (!catalog) {
    throw new Error("Vui lòng chọn mục lục trước khi tạo hồ sơ.");
  }

  if (!storageFile) {
    throw new Error("Vui lòng chọn tệp lưu trữ trước khi tạo hồ sơ.");
  }

  if (!profileCode) {
    throw new Error("Vui lòng kiểm tra và nhập mã hồ sơ.");
  }

  if (!title) {
    throw new Error("Vui lòng kiểm tra và nhập tên hồ sơ.");
  }

  return {
    catalog,
    storage_file: storageFile,
    profile_code: profileCode,
    title,
    description: values.description.trim() || undefined,
    year: parseOptionalNumber("Năm", values.year),
    total_pages: parseOptionalNumber("Tổng số trang", values.total_pages),
    retention_period: values.retention_period.trim() || null,
    language: values.language.trim() || "Tiếng Việt",
    notes: values.notes.trim() || undefined,
  };
}

export function OcrProfileSuggestionCard({
  profile,
  digitalFiles,
}: OcrProfileSuggestionCardProps) {
  const router = useRouter();
  const { createMutation } = useProfileMutations();

  const catalogQuery = useQuery({
    queryKey: ["master-data", "catalogs", "ocr-profile-suggestion"],
    queryFn: () => getCatalogsApi(),
  });

  const storageFileQuery = useQuery({
    queryKey: ["master-data", "storage-files", "ocr-profile-suggestion"],
    queryFn: () => getStorageFilesApi(),
  });

  const pdfFiles = useMemo(() => {
    return digitalFiles.filter((file) => canPreviewDigitalFile(file));
  }, [digitalFiles]);

  const [selectedDigitalFileId, setSelectedDigitalFileId] = useState("");
  const [shouldLoadSuggestion, setShouldLoadSuggestion] = useState(false);
  const [values, setValues] = useState<SuggestionFormValues>(() => ({
    ...EMPTY_VALUES,
    catalog: String(profile.catalog_id || profile.catalog || ""),
    storage_file: String(profile.storage_file_id || profile.storage_file || ""),
  }));
  const [formError, setFormError] = useState<string | null>(null);

  const suggestionQuery = useOcrProfileSuggestion(
    shouldLoadSuggestion ? selectedDigitalFileId : null,
  );

  const selectedFile = pdfFiles.find(
    (file) => String(file.id) === selectedDigitalFileId,
  );

  useEffect(() => {
    if (selectedDigitalFileId || pdfFiles.length === 0) return;

    setSelectedDigitalFileId(String(pdfFiles[0].id));
  }, [pdfFiles, selectedDigitalFileId]);

  useEffect(() => {
    const result = suggestionQuery.data;

    if (!result?.suggestion) return;

    const suggestion = result.suggestion;

    setValues((currentValues) => ({
      ...currentValues,
      catalog:
        currentValues.catalog ||
        String(profile.catalog_id || profile.catalog || ""),
      storage_file:
        currentValues.storage_file ||
        String(profile.storage_file_id || profile.storage_file || ""),
      profile_code: suggestion.profile_code || "",
      title: suggestion.title || "",
      description: suggestion.description || "",
      year: suggestion.year ? String(suggestion.year) : "",
      total_pages: suggestion.total_pages ? String(suggestion.total_pages) : "",
      retention_period: suggestion.retention_period || "Vĩnh viễn",
      language: suggestion.language || "Tiếng Việt",
      notes: suggestion.notes || "",
    }));
  }, [profile, suggestionQuery.data]);

  function setValue<K extends keyof SuggestionFormValues>(
    key: K,
    value: SuggestionFormValues[K],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  async function handleLoadSuggestion() {
    setFormError(null);

    if (!selectedDigitalFileId) {
      setFormError("Vui lòng chọn file PDF đã OCR.");
      return;
    }

    setShouldLoadSuggestion(true);

    if (shouldLoadSuggestion) {
      await suggestionQuery.refetch();
    }
  }

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      const payload = buildPayload(values);
      const createdProfile = await createMutation.mutateAsync(payload);

      router.push(`/ho-so/${createdProfile.id}`);
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError("Không tạo được hồ sơ từ OCR.");
    }
  }

  if (pdfFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tạo hồ sơ từ OCR</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cần có file PDF trong hồ sơ để đọc OCR và tạo gợi ý.
          </p>
        </CardHeader>

        <CardContent>
          <Alert>
            <AlertDescription>
              Hồ sơ này chưa có file PDF để tạo gợi ý hồ sơ từ OCR.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo hồ sơ từ OCR</CardTitle>
        <p className="text-sm text-muted-foreground">
          Đọc text OCR từ PDF, tự gợi ý mã hồ sơ và tên hồ sơ. Người dùng cần kiểm tra, chọn mục lục/tệp lưu trữ rồi mới lưu.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        {suggestionQuery.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(
                suggestionQuery.error,
                "Không lấy được gợi ý hồ sơ từ OCR. Hãy chạy OCR cho file này trước.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {createMutation.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(
                createMutation.error,
                "Không tạo được hồ sơ từ OCR.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-2">
            <Label>File PDF đã OCR</Label>
            <Select
              value={selectedDigitalFileId}
              onValueChange={(value) => {
                setSelectedDigitalFileId(value);
                setShouldLoadSuggestion(false);
                setFormError(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn file PDF đã OCR" />
              </SelectTrigger>

              <SelectContent>
                {pdfFiles.map((file) => (
                  <SelectItem key={file.id} value={String(file.id)}>
                    #{file.id} - {getDigitalFileDisplayName(file)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedFile ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {getDigitalFileDisplayName(selectedFile)}
                </Badge>

                {selectedFile.file_size ? (
                  <Badge variant="outline">
                    {formatFileSize(selectedFile.file_size)}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleLoadSuggestion}
            disabled={!selectedDigitalFileId || suggestionQuery.isFetching}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {suggestionQuery.isFetching ? "Đang đọc OCR..." : "Lấy gợi ý"}
          </Button>
        </div>

        {suggestionQuery.data ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Độ tin cậy: {suggestionQuery.data.confidence ?? 0}%
            </Badge>

            {suggestionQuery.data.ocr_job_id ? (
              <Badge variant="outline">
                OCR job #{suggestionQuery.data.ocr_job_id}
              </Badge>
            ) : null}

            {suggestionQuery.data.warnings?.map((warning) => (
              <Badge key={warning} variant="outline">
                {warning}
              </Badge>
            ))}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleCreateProfile}>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label>Mục lục</Label>
              <Select
                value={values.catalog}
                onValueChange={(value) => setValue("catalog", value)}
                disabled={catalogQuery.isLoading || createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mục lục" />
                </SelectTrigger>

                <SelectContent>
                  {(catalogQuery.data ?? []).map((catalog) => (
                    <SelectItem key={catalog.id} value={String(catalog.id)}>
                      {getCatalogLabel(catalog)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tệp lưu trữ</Label>
              <Select
                value={values.storage_file}
                onValueChange={(value) => setValue("storage_file", value)}
                disabled={storageFileQuery.isLoading || createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tệp lưu trữ" />
                </SelectTrigger>

                <SelectContent>
                  {(storageFileQuery.data ?? []).map((storageFile) => (
                    <SelectItem key={storageFile.id} value={String(storageFile.id)}>
                      {getStorageFileLabel(storageFile)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mã hồ sơ</Label>
              <Input
                value={values.profile_code}
                onChange={(event) => setValue("profile_code", event.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Năm</Label>
              <Input
                type="number"
                value={values.year}
                onChange={(event) => setValue("year", event.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label>Tên hồ sơ</Label>
              <Input
                value={values.title}
                onChange={(event) => setValue("title", event.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label>Mô tả</Label>
              <Textarea
                value={values.description}
                onChange={(event) => setValue("description", event.target.value)}
                rows={5}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Tổng số trang</Label>
              <Input
                type="number"
                value={values.total_pages}
                onChange={(event) => setValue("total_pages", event.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Thời hạn bảo quản</Label>
              <Input
                value={values.retention_period}
                onChange={(event) => setValue("retention_period", event.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Ngôn ngữ</Label>
              <Input
                value={values.language}
                onChange={(event) => setValue("language", event.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Input
                value={values.notes}
                onChange={(event) => setValue("notes", event.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Đang tạo..." : "Tạo hồ sơ mới từ OCR"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => suggestionQuery.refetch()}
              disabled={!shouldLoadSuggestion || suggestionQuery.isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tải lại gợi ý
            </Button>
          </div>
        </form>

        {suggestionQuery.data?.preview_text ? (
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Xem đoạn OCR dùng để gợi ý
            </summary>

            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
              {suggestionQuery.data.preview_text}
            </pre>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}