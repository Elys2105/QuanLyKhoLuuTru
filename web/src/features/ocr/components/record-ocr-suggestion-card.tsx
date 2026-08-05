"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Wand2,
} from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { DigitalFile } from "@/features/digital-files/types";
import {
  canPreviewDigitalFile,
  getDigitalFileDisplayName,
} from "@/features/digital-files/utils/pdf-file-utils";
import { updateDocumentApi } from "@/features/documents/api";
import type {
  Document,
  DocumentFormValues,
} from "@/features/documents/types";
import {
  buildDocumentPayload,
  createDocumentFormValuesFromDocument,
  validateDocumentForm,
} from "@/features/documents/utils/document-form-utils";
import {
  getOcrProfileSuggestionApi,
  getOcrProgressForDigitalFileApi,
  runOcrForDigitalFileApi,
} from "@/features/ocr/api";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface RecordOcrSuggestionCardProps {
  record: Document;
  file?: DigitalFile | null;
  onApplied?: () => void;
}

type SuggestionData = {
  suggestion?: Record<string, unknown>;
  missing_required_fields?: string[];
  warnings?: string[];
  confidence?: number | null;
  preview_text?: string;
};

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function display(value: unknown) {
  const valueText = text(value).trim();
  return valueText || "-";
}

function normalizeStatus(status?: unknown) {
  return text(status).toUpperCase();
}

function jobField(job: unknown, field: string) {
  return (job as Record<string, unknown> | null)?.[field];
}

function isNoOcrError(error: unknown) {
  const message = getApiErrorMessage(error, "").toLowerCase();

  return (
    message.includes("chưa có ocr") ||
    message.includes("ocr chưa có text") ||
    message.includes("not found") ||
    message.includes("404")
  );
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const valueText = text(value).trim();

    if (valueText) {
      return valueText;
    }
  }

  return "";
}

function numberText(...values: unknown[]) {
  for (const value of values) {
    const valueText = text(value).trim();

    if (!valueText) continue;

    const parsed = Number(valueText);

    if (!Number.isNaN(parsed)) {
      return String(parsed);
    }
  }

  return "";
}


function normalizeDateInput(value: unknown) {
  const valueText = text(value).trim();

  if (!valueText) return "";

  const isoMatch = valueText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return valueText;
  }

  const slashMatch = valueText.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);

  if (!slashMatch) {
    return "";
  }

  const day = slashMatch[1].padStart(2, "0");
  const month = slashMatch[2].padStart(2, "0");
  const year = slashMatch[3];

  return `${year}-${month}-${day}`;
}

function isCompletedOcrJob(job: unknown) {
  return normalizeStatus(jobField(job, "status")) === "COMPLETED";
}

function isRunningOcrJob(job: unknown) {
  return ["PENDING", "RUNNING"].includes(normalizeStatus(jobField(job, "status")));
}


function cleanOcrTitleText(value: unknown) {
  return text(value)
    .replace(/\s*[-–—_={]{3,}\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOcrTitleMatch(value: unknown) {
  return cleanOcrTitleText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isParentheticalOnlyOcrTitle(value: unknown) {
  const cleaned = cleanOcrTitleText(value);

  return /^\([^)]{2,80}\)$/.test(cleaned) || /^（[^）]{2,80}）$/.test(cleaned);
}

function isOcrSeparatorLine(value: string) {
  return /^[-–—_=.\s]{3,}$/.test(value.trim());
}

function shouldStopOcrTitleContinuation(value: string) {
  const line = value.trim();
  const normalized = normalizeOcrTitleMatch(line);

  if (!line) return true;

  return (
    /^(\d+[\.\)]|[ivx]+[\.\)]|[a-z][\.\)])\s+/i.test(line) ||
    normalized.startsWith("noi nhan") ||
    normalized.startsWith("kinh gui") ||
    normalized.startsWith("thoi gian") ||
    normalized.startsWith("dia diem") ||
    normalized.startsWith("thanh phan") ||
    normalized.startsWith("chu tri") ||
    normalized.startsWith("kt.") ||
    normalized.startsWith("chanh van phong") ||
    normalized.startsWith("tran trong")
  );
}

function extractOcrTitleContinuation(previewText: unknown, baseTitle: unknown) {
  const base = normalizeOcrTitleMatch(baseTitle);
  const lines = text(previewText)
    .split(/\r?\n/)
    .map((line) => cleanOcrTitleText(line))
    .filter(Boolean);

  if (lines.length === 0) return "";

  let startIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isOcrSeparatorLine(line)) continue;

    const normalized = normalizeOcrTitleMatch(line);

    if (
      normalized.includes(base) ||
      normalized.includes("thay giay moi") ||
      normalized.includes("thay giay moi")
    ) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex < 0) {
    return "";
  }

  const collected: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line || isOcrSeparatorLine(line)) {
      continue;
    }

    const normalized = normalizeOcrTitleMatch(line);

    if (
      normalized === "thong bao" ||
      normalized === "giay moi" ||
      normalized === base ||
      normalized.includes("thay giay moi")
    ) {
      continue;
    }

    if (shouldStopOcrTitleContinuation(line)) {
      if (collected.length > 0) break;
      continue;
    }

    collected.push(line);

    if (collected.join(" ").length >= 380 || collected.length >= 5) {
      break;
    }
  }

  return cleanOcrTitleText(collected.join(" "));
}

function buildOcrFullTitle(
  suggestion: Record<string, unknown> | undefined,
  previewText: unknown,
  fallbackTitle: unknown,
) {
  const suggestedTitle = cleanOcrTitleText(
    suggestion?.title || suggestion?.summary || fallbackTitle,
  );

  if (!suggestedTitle) {
    return cleanOcrTitleText(fallbackTitle);
  }

  if (!isParentheticalOnlyOcrTitle(suggestedTitle) && suggestedTitle.length >= 30) {
    return suggestedTitle;
  }

  const continuation = extractOcrTitleContinuation(previewText, suggestedTitle);

  if (!continuation) {
    return suggestedTitle;
  }

  return cleanOcrTitleText(`${suggestedTitle} ${continuation}`);
}


function buildOcrSuggestionFormValues(
  record: Document,
  suggestion?: Record<string, unknown>,
  previewText: unknown = "",
): DocumentFormValues {
  const values = createDocumentFormValuesFromDocument(record);

  if (!suggestion) {
    return values;
  }

  return {
    ...values,
    document_identifier: firstText(
      suggestion.document_identifier,
      values.document_identifier,
    ),
    document_code: firstText(
      suggestion.document_code,
      suggestion.profile_code,
      values.document_code,
    ),
    document_number: firstText(
      suggestion.document_number,
      values.document_number,
    ),
    document_symbol: firstText(
      suggestion.document_symbol,
      values.document_symbol,
    ),
    document_type: firstText(
      suggestion.document_type,
      values.document_type,
    ),
    title: buildOcrFullTitle(suggestion, previewText, values.title),
    summary: firstText(
      suggestion.summary,
      values.summary,
    ),
    document_date:
      normalizeDateInput(suggestion.document_date) ||
      normalizeDateInput(values.document_date) ||
      values.document_date,
    author: firstText(
      suggestion.author,
      values.author,
    ),
    signer: firstText(
      suggestion.signer,
      values.signer,
    ),
    copy_type: firstText(
      suggestion.copy_type,
      values.copy_type,
    ),
    page_count: numberText(
      suggestion.page_count,
      suggestion.total_pages,
      values.page_count,
    ),
    language: firstText(
      suggestion.language,
      values.language,
      "Tiếng Việt",
    ),
    security_level: firstText(
      suggestion.security_level,
      values.security_level,
      "Thường",
    ),
    page_start: numberText(
      suggestion.page_start,
      values.page_start,
    ),
    page_end: numberText(
      suggestion.page_end,
      values.page_end,
    ),
    page_number: firstText(
      suggestion.page_number,
      values.page_number,
    ),
    attachment_note: firstText(
      suggestion.attachment_note,
      values.attachment_note,
    ),
    digital_signature: firstText(
      suggestion.digital_signature,
      values.digital_signature,
    ),
    notes: firstText(
      suggestion.notes,
      suggestion.note,
      values.notes,
    ),
  };
}

function FieldInput({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "space-y-1 md:col-span-2" : "space-y-1"}>
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="space-y-1 md:col-span-2">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

export function RecordOcrSuggestionCard({
  record,
  file,
  onApplied,
}: RecordOcrSuggestionCardProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [ocrFormValues, setOcrFormValues] = useState<DocumentFormValues>(() =>
    createDocumentFormValuesFromDocument(record),
  );

  const canUseOcr = Boolean(file && canPreviewDigitalFile(file));

  const progressQuery = useQuery({
    queryKey: ["ocr-progress", file?.id],
    queryFn: () => getOcrProgressForDigitalFileApi(file!.id),
    enabled: Boolean(file?.id),
    refetchInterval: 3000,
  });

  const jobs = useMemo(
    () => ((progressQuery.data ?? []) as unknown[]),
    [progressQuery.data],
  );

  const latestJob = useMemo(() => {
    if (jobs.length === 0) return null;

    return [...jobs].sort(
      (a, b) => Number(jobField(b, "id") || 0) - Number(jobField(a, "id") || 0),
    )[0];
  }, [jobs]);

  const isOcrRunning = jobs.some((job) => isRunningOcrJob(job));

  const displayJob = useMemo(() => {
    if (jobs.length === 0) return null;

    const runningJob = [...jobs]
      .sort((a, b) => Number(jobField(b, "id") || 0) - Number(jobField(a, "id") || 0))
      .find((job) => isRunningOcrJob(job));

    if (runningJob) {
      return runningJob;
    }

    const completedJob = [...jobs]
      .sort((a, b) => Number(jobField(b, "id") || 0) - Number(jobField(a, "id") || 0))
      .find((job) => isCompletedOcrJob(job));

    return completedJob ?? latestJob;
  }, [jobs, latestJob]);

  const suggestionQuery = useQuery({
    queryKey: ["ocr-profile-suggestion", file?.id],
    queryFn: () => getOcrProfileSuggestionApi(file!.id),
    enabled: Boolean(file?.id && canUseOcr),
    retry: false,
    staleTime: 30_000,
  });

  const suggestionData = suggestionQuery.data as SuggestionData | undefined;
  const suggestion = suggestionData?.suggestion;
  const missingFields = suggestionData?.missing_required_fields ?? [];
  const warnings = suggestionData?.warnings ?? [];
  const confidence = suggestionData?.confidence ?? null;
  const previewText = suggestionData?.preview_text ?? "";
  const noOcrYet = suggestionQuery.isError && isNoOcrError(suggestionQuery.error);

  useEffect(() => {
    setOcrFormValues(buildOcrSuggestionFormValues(record, suggestion, previewText));
  }, [record, suggestion]);

  function setField<K extends keyof DocumentFormValues>(
    field: K,
    value: DocumentFormValues[K],
  ) {
    setOcrFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const runOcrMutation = useMutation({
    mutationFn: async () => {
      if (!file?.id) {
        throw new Error("Chưa có file PDF để chạy OCR.");
      }

      return runOcrForDigitalFileApi(file.id);
    },
    onSuccess: async () => {
      setMessage("Đã bắt đầu OCR. Khi OCR xong, bấm “Lấy gợi ý OCR”.");
      await queryClient.invalidateQueries({
        queryKey: ["ocr-progress", file?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["ocr-profile-suggestion", file?.id],
      });
    },
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!suggestion) {
        throw new Error("Chưa có gợi ý OCR để áp dụng.");
      }

      const profileId = record.profile_id ?? record.profile;
      const validationError = validateDocumentForm(ocrFormValues, profileId);

      if (validationError) {
        throw new Error(validationError);
      }

      return updateDocumentApi(
        record.id,
        buildDocumentPayload(ocrFormValues, profileId),
      );
    },
    onSuccess: async () => {
      setMessage("Đã điền dữ liệu OCR vào các trường bản ghi.");
      await queryClient.invalidateQueries({
        queryKey: ["record-detail", String(record.id)],
      });
      await queryClient.invalidateQueries({
        queryKey: ["profile-documents", record.profile_id ?? record.profile],
      });
      onApplied?.();
    },
  });

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-xl border bg-card p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wand2 className="h-4 w-4" />
              Gợi ý OCR
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Nếu PDF đã OCR, hệ thống sẽ gợi ý full trường bản ghi. Kiểm tra/sửa lại rồi mới điền vào bản ghi.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {confidence !== null ? (
              <Badge variant="secondary">Tin cậy {confidence}%</Badge>
            ) : null}

            {suggestion ? <Badge>Có gợi ý</Badge> : null}

            {displayJob ? (
              <Badge variant="outline">
                OCR: {display(jobField(displayJob, "status"))}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-3 rounded-lg border bg-background p-3 text-sm">
          <div className="text-xs text-muted-foreground">File đang đọc</div>
          <div className="mt-1 truncate font-medium">
            {file ? getDigitalFileDisplayName(file) : "Chưa có file PDF"}
          </div>

          {displayJob ? (
            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div>Job #{display(jobField(displayJob, "id"))}</div>
              <div>Mode {display(jobField(displayJob, "ocr_mode") || jobField(displayJob, "mode"))}</div>
              <div>{display(jobField(displayJob, "progress_percent") || 0)}%</div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => suggestionQuery.refetch()}
            disabled={!file?.id || !canUseOcr || suggestionQuery.isFetching}
          >
            {suggestionQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Lấy gợi ý OCR
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => runOcrMutation.mutate()}
            disabled={!canUseOcr || runOcrMutation.isPending || isOcrRunning}
          >
            {runOcrMutation.isPending || isOcrRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isOcrRunning ? "Đang OCR..." : "Chạy OCR nhanh"}
          </Button>

          <Button
            type="button"
            onClick={() => applySuggestionMutation.mutate()}
            disabled={!suggestion || applySuggestionMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {applySuggestionMutation.isPending ? "Đang áp dụng..." : "Điền vào bản ghi"}
          </Button>
        </div>
      </div>

      {message ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {!file ? (
        <Alert>
          <AlertDescription>
            Chưa có file PDF trong bản ghi. Upload PDF trước để lấy gợi ý OCR.
          </AlertDescription>
        </Alert>
      ) : null}

      {noOcrYet ? (
        <Alert>
          <AlertDescription>
            File này chưa có OCR text. Bấm “Chạy OCR nhanh” một lần, đợi xong rồi lấy gợi ý.
          </AlertDescription>
        </Alert>
      ) : null}

      {suggestionQuery.isError && !noOcrYet ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {getApiErrorMessage(suggestionQuery.error, "Không lấy được gợi ý OCR.")}
          </AlertDescription>
        </Alert>
      ) : null}

      {runOcrMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {getApiErrorMessage(runOcrMutation.error, "Không chạy được OCR.")}
          </AlertDescription>
        </Alert>
      ) : null}

      {applySuggestionMutation.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {getApiErrorMessage(applySuggestionMutation.error, "Không áp dụng được gợi ý OCR.")}
          </AlertDescription>
        </Alert>
      ) : null}

      {suggestionQuery.isLoading || suggestionQuery.isFetching ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : suggestion ? (
        <div className="space-y-4">
          <div className="min-w-0 rounded-xl border bg-card p-4">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <div className="text-sm font-semibold">
                  Full trường bản ghi từ gợi ý OCR
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Có thể sửa trực tiếp các trường dưới đây trước khi bấm “Điền vào bản ghi”.
                </p>
              </div>

              {previewText ? (
                <Badge variant="outline">Có text OCR</Badge>
              ) : null}
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <FieldInput
                label="Mã định danh tài liệu"
                value={ocrFormValues.document_identifier}
                onChange={(value) => setField("document_identifier", value)}
              />
              <FieldInput
                label="Số thứ tự trong hồ sơ"
                value={ocrFormValues.order_in_profile}
                onChange={(value) => setField("order_in_profile", value)}
              />
              <FieldInput
                label="Tên thể loại văn bản"
                value={ocrFormValues.document_type}
                onChange={(value) => setField("document_type", value)}
              />
              <FieldInput
                label="Số/ký hiệu văn bản"
                value={ocrFormValues.document_code}
                onChange={(value) => setField("document_code", value)}
                required
              />
              <FieldInput
                label="Số văn bản"
                value={ocrFormValues.document_number}
                onChange={(value) => setField("document_number", value)}
              />
              <FieldInput
                label="Ký hiệu văn bản"
                value={ocrFormValues.document_symbol}
                onChange={(value) => setField("document_symbol", value)}
              />
              <FieldInput
                label="Tiêu đề/Tên gọi văn bản"
                value={ocrFormValues.title}
                onChange={(value) => setField("title", value)}
                required
                wide
              />
              <FieldInput
                label="Ngày/tháng/năm văn bản"
                type="date"
                value={ocrFormValues.document_date}
                onChange={(value) => setField("document_date", value)}
              />
              <FieldInput
                label="Tác giả/Cơ quan ban hành"
                value={ocrFormValues.author}
                onChange={(value) => setField("author", value)}
              />
              <FieldInput
                label="Người ký"
                value={ocrFormValues.signer}
                onChange={(value) => setField("signer", value)}
              />
              <FieldInput
                label="Loại bản"
                value={ocrFormValues.copy_type}
                onChange={(value) => setField("copy_type", value)}
              />
              <FieldInput
                label="Số lượng trang"
                value={ocrFormValues.page_count}
                onChange={(value) => setField("page_count", value)}
              />
              <FieldInput
                label="Ngôn ngữ"
                value={ocrFormValues.language}
                onChange={(value) => setField("language", value)}
              />
              <FieldInput
                label="Độ mật"
                value={ocrFormValues.security_level}
                onChange={(value) => setField("security_level", value)}
              />
              <FieldInput
                label="Trang số"
                value={ocrFormValues.page_number}
                onChange={(value) => setField("page_number", value)}
              />
              <FieldInput
                label="Từ trang"
                value={ocrFormValues.page_start}
                onChange={(value) => setField("page_start", value)}
              />
              <FieldInput
                label="Đến trang"
                value={ocrFormValues.page_end}
                onChange={(value) => setField("page_end", value)}
              />
              <FieldInput
                label="Tệp/tập tin đính kèm văn bản"
                value={ocrFormValues.attachment_note}
                onChange={(value) => setField("attachment_note", value)}
                wide
              />
              <FieldInput
                label="Chữ ký số"
                value={ocrFormValues.digital_signature}
                onChange={(value) => setField("digital_signature", value)}
                wide
              />
              <FieldTextarea
                label="Trích yếu nội dung"
                value={ocrFormValues.summary}
                onChange={(value) => setField("summary", value)}
                rows={4}
              />
              <FieldTextarea
                label="Ghi chú"
                value={ocrFormValues.notes}
                onChange={(value) => setField("notes", value)}
                rows={3}
              />
            </div>
          </div>

          {missingFields.length > 0 ? (
            <Alert>
              <AlertDescription>
                <div className="font-medium">
                  Thiếu trường bắt buộc nếu dùng để tạo hồ sơ:
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missingFields.map((field) => (
                    <Badge key={field} variant="outline">
                      {field}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {warnings.length > 0 ? (
            <Alert>
              <AlertDescription>
                <div className="font-medium">Cảnh báo:</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
