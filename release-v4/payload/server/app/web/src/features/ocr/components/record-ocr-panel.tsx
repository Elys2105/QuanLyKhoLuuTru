"use client";

import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { DigitalFile } from "@/features/digital-files/types";
import {
  deleteOcrForDigitalFileApi,
  getOcrProgressForDigitalFileApi,
  getOcrTextForDigitalFileApi,
  runOcrForDigitalFileApi,
} from "@/features/ocr/api";
import type {
  OcrJob,
  OcrTextResult,
} from "@/features/ocr/types";
import { getOcrText } from "@/features/ocr/utils/ocr-utils";
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

interface RecordOcrPanelProps {
  recordId: string | number;
  digitalFiles: DigitalFile[];
}

type OcrStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | string;

function getValue<T = unknown>(
  item: unknown,
  key: string,
  fallback?: T,
): T | undefined {
  if (item && typeof item === "object" && key in item) {
    return (item as Record<string, T>)[key];
  }

  return fallback;
}

function isPdfFile(file: DigitalFile) {
  const name = String(getValue(file, "original_name", "") || "").toLowerCase();
  const mimeType = String(getValue(file, "mime_type", "") || "").toLowerCase();
  const fileType = String(getValue(file, "file_type", "") || "").toLowerCase();
  const extension = String(getValue(file, "file_extension", "") || "").toLowerCase();

  return Boolean(
    getValue(file, "is_pdf", false) ||
    fileType === "pdf" ||
    extension === ".pdf" ||
    mimeType.includes("pdf") ||
    name.endsWith(".pdf"),
  );
}

function getFileName(file?: DigitalFile | null) {
  if (!file) return "Chưa chọn file";

  return (
    String(getValue(file, "original_name", "") || "") ||
    String(getValue(file, "file_name", "") || "") ||
    `File #${String(getValue(file, "id", ""))}`
  );
}

function getStatus(job?: OcrJob | null): OcrStatus {
  return String(getValue(job, "status", "") || "").toUpperCase();
}

function isActiveJob(job?: OcrJob | null) {
  const status = getStatus(job);

  return status === "PENDING" || status === "RUNNING";
}

function isDoneJob(job?: OcrJob | null) {
  const status = getStatus(job);

  return status === "COMPLETED" || status === "SUCCESS";
}

function isFailedJob(job?: OcrJob | null) {
  return getStatus(job) === "FAILED";
}

function getBestActiveJob(jobs: OcrJob[]) {
  const activeJobs = jobs.filter(isActiveJob);

  return (
    activeJobs.find((job) => getValue(job, "ocr_mode") === "quality") ||
    activeJobs.find((job) => getValue(job, "ocr_mode") === "fast") ||
    activeJobs[0] ||
    null
  );
}

function getBestCompletedJob(jobs: OcrJob[]) {
  const completedJobs = jobs.filter(isDoneJob);

  return (
    completedJobs.find((job) => getValue(job, "ocr_mode") === "quality") ||
    completedJobs.find((job) => getValue(job, "ocr_mode") === "fast") ||
    completedJobs[0] ||
    null
  );
}

function getBestFailedJob(jobs: OcrJob[]) {
  return jobs.find(isFailedJob) || null;
}

function percentOf(job?: OcrJob | null) {
  const value = Number(getValue(job, "progress_percent", 0) ?? 0);

  if (Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(100, value));
}

function getPageText(job?: OcrJob | null) {
  if (!job) return "-";

  const current =
    getValue(job, "current_page") ??
    getValue(job, "processed_pages") ??
    getValue(job, "processed_page_count") ??
    0;

  const total =
    getValue(job, "page_count") ??
    getValue(job, "total_pages") ??
    0;

  return `${current}/${total}`;
}

function getJobText(job?: OcrJob | null) {
  if (!job) return "-";

  return `#${String(getValue(job, "id", "-"))}`;
}

function splitOcrPages(text: string) {
  const normalized = (text || "").replace(/\r\n?/g, "\n").trim();

  if (!normalized) return [];

  const regex = /^=+\s*PAGE\s+(\d+)\s*=+$/gim;
  const matches = Array.from(normalized.matchAll(regex));

  if (matches.length === 0) {
    return [
      {
        pageNumber: 1,
        text: normalized,
      },
    ];
  }

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;

    return {
      pageNumber: Number(match[1] || index + 1),
      text: normalized.slice(start, end).trim(),
    };
  });
}

function downloadText(text: string, fileName = "ocr-text.txt") {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function OcrStatusBadge({ job }: { job?: OcrJob | null }) {
  const status = getStatus(job);

  if (status === "RUNNING") {
    return (
      <Badge className="animate-pulse">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Đang OCR
      </Badge>
    );
  }

  if (status === "PENDING") {
    return <Badge variant="secondary">Đang chờ</Badge>;
  }

  if (status === "COMPLETED" || status === "SUCCESS") {
    return (
      <Badge variant="secondary">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Hoàn thành
      </Badge>
    );
  }

  if (status === "FAILED") {
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Lỗi
      </Badge>
    );
  }

  return <Badge variant="outline">Chưa OCR</Badge>;
}

function OcrProgressBar({
  percent,
  running,
}: {
  percent: number;
  running: boolean;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={
          running && percent <= 1
            ? "h-full w-1/3 animate-pulse rounded-full bg-foreground"
            : "h-full rounded-full bg-foreground transition-all duration-500"
        }
        style={{
          width: running && percent <= 1 ? "35%" : `${percent}%`,
        }}
      />
    </div>
  );
}


function compactOcrFileName(value: string, maxLength = 72) {
  const fileName = value.trim();

  if (fileName.length <= maxLength) {
    return fileName;
  }

  return `${fileName.slice(0, 38)}…${fileName.slice(-28)}`;
}

export function RecordOcrPanel({
  recordId,
  digitalFiles,
}: RecordOcrPanelProps) {
  const queryClient = useQueryClient();
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(true);

  const pdfFiles = useMemo(() => {
    return digitalFiles.filter(isPdfFile);
  }, [digitalFiles]);

  useEffect(() => {
    if (selectedFileId) return;

    const firstFile = pdfFiles[0];

    if (firstFile?.id) {
      setSelectedFileId(String(firstFile.id));
    }
  }, [pdfFiles, selectedFileId]);

  const selectedFile = pdfFiles.find((file) => String(file.id) === selectedFileId);
  const selectedDigitalFileId = selectedFile?.id ?? null;

  const progressQuery = useQuery({
    queryKey: ["record-ocr-progress", selectedDigitalFileId],
    queryFn: () => getOcrProgressForDigitalFileApi(selectedDigitalFileId as string | number),
    enabled: Boolean(selectedDigitalFileId),
    refetchInterval: (query) => {
      const jobs = (query.state.data ?? []) as OcrJob[];
      const running = jobs.some(isActiveJob);

      return running ? 1500 : false;
    },
  });

  const textQuery = useQuery({
    queryKey: ["record-ocr-text", selectedDigitalFileId],
    queryFn: () => getOcrTextForDigitalFileApi(selectedDigitalFileId as string | number),
    enabled: Boolean(selectedDigitalFileId),
  });

  const runMutation = useMutation({
    mutationFn: () => runOcrForDigitalFileApi(selectedDigitalFileId as string | number),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["record-ocr-progress", selectedDigitalFileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["record-ocr-text", selectedDigitalFileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["ocr-progress", selectedDigitalFileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["ocr-text", selectedDigitalFileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["record-detail", recordId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOcrForDigitalFileApi(selectedDigitalFileId as string | number),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["record-ocr-progress", selectedDigitalFileId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["record-ocr-text", selectedDigitalFileId],
      });
    },
  });

  const jobs = progressQuery.data ?? [];
  const activeJob = getBestActiveJob(jobs);
  const completedJob = getBestCompletedJob(jobs);
  const failedJob = getBestFailedJob(jobs);
  const displayJob = activeJob || completedJob || failedJob || null;
  const running = Boolean(activeJob);
  const busy = running || runMutation.isPending;
  const percent = activeJob ? percentOf(activeJob) : completedJob ? 100 : percentOf(displayJob);

  const ocrText = textQuery.data
    ? getOcrText(textQuery.data as OcrTextResult)
    : "";

  const pages = splitOcrPages(ocrText);

  async function handleRefresh() {
    await progressQuery.refetch();
    await textQuery.refetch();
  }

  async function handleCopy() {
    if (!ocrText) return;

    await navigator.clipboard.writeText(ocrText);
    setCopied(true);

    window.setTimeout(() => setCopied(false), 1200);
  }

  async function handleDelete() {
    if (!selectedDigitalFileId) return;

    const ok = window.confirm("Xóa OCR của file này để chạy lại?");

    if (!ok) return;

    await deleteMutation.mutateAsync();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              OCR của bản ghi
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              OCR dùng để tìm kiếm nội dung, copy/tải text và gợi ý biên mục. PDF gốc xem ở khung bên phải.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <OcrStatusBadge job={displayJob} />

            {ocrText ? (
              <Badge variant="outline">
                {pages.length || 1} trang text
              </Badge>
            ) : null}

            {selectedDigitalFileId ? (
              <Badge variant="outline">
                File #{selectedDigitalFileId}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="record-ocr-panel-safe min-w-0 space-y-4">
        {pdfFiles.length === 0 ? (
          <Alert>
            <AlertDescription>
              Bản ghi này chưa có PDF. Hãy upload PDF vào bản ghi trước, sau đó chạy OCR tại đây.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="ocr-file-select-row grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedFileId}
                onChange={(event) => setSelectedFileId(event.target.value)}
                className="ocr-file-select h-9 rounded-md border bg-background px-3 text-sm"
              >
                {pdfFiles.map((file) => (
                  <option key={file.id} value={String(file.id)}>
                    #{file.id} - {getFileName(file)}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => runMutation.mutate()}
                  disabled={!selectedDigitalFileId || busy}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {running ? "Đang OCR..." : completedJob ? "OCR lại" : "Chạy OCR"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={!selectedDigitalFileId || progressQuery.isFetching || textQuery.isFetching}
                >
                  <RefreshCw
                    className={
                      progressQuery.isFetching || textQuery.isFetching
                        ? "mr-2 h-4 w-4 animate-spin"
                        : "mr-2 h-4 w-4"
                    }
                  />
                  Tải lại
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowText((value) => !value)}
                  disabled={!ocrText}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {showText ? "Ẩn text" : "Hiện text"}
                </Button>
              </div>
            </div>

            {selectedFile ? (
              <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <div className="truncate font-medium">
                  {getFileName(selectedFile)}
                </div>
                <div className="mt-1 text-muted-foreground">
                  File này thuộc bản ghi hiện tại. Đây là text OCR duy nhất dùng cho tìm kiếm nội dung.
                </div>
              </div>
            ) : null}

            <div
              className={
                running
                  ? "rounded-xl border border-foreground/50 bg-muted/20 p-3"
                  : "rounded-xl border bg-muted/10 p-3"
              }
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <OcrStatusBadge job={displayJob} />

                {completedJob && activeJob ? (
                  <Badge variant="outline">
                    Đã có text nhanh
                  </Badge>
                ) : null}

                <div className="ml-auto text-sm font-semibold tabular-nums">
                  {running && percent <= 1 ? "Đang xử lý" : `${percent}%`}
                </div>
              </div>

              <OcrProgressBar percent={percent} running={running} />

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Job: {getJobText(displayJob)}</span>
                <span>Mode: {String(getValue(displayJob, "ocr_mode", "-") ?? "-")}</span>
                <span>Engine: {String(getValue(displayJob, "engine", "-") ?? "-")}</span>
                <span>Trang: {getPageText(displayJob)}</span>
                <span>Ký tự: {String(getValue(displayJob, "character_count", 0) ?? 0)}</span>
              </div>
            </div>

            {runMutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(runMutation.error, "Chạy OCR thất bại.")}
                </AlertDescription>
              </Alert>
            ) : null}

            {deleteMutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(deleteMutation.error, "Xóa OCR thất bại.")}
                </AlertDescription>
              </Alert>
            ) : null}

            {ocrText && showText ? (
              <div className="min-w-0 rounded-xl border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="text-sm font-semibold">
                    Text OCR của bản ghi
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => downloadText(ocrText)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Tải text
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? "Đã copy" : "Copy"}
                    </Button>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto bg-muted/20 p-3">
                  {pages.length > 0 ? (
                    <div className="min-w-0 space-y-4">
                      {pages.map((page) => (
                        <div key={page.pageNumber} className="rounded-lg bg-background p-3">
                          <div className="mb-2 text-xs font-semibold text-muted-foreground">
                            Trang {page.pageNumber}
                          </div>

                          <pre
                            className="whitespace-pre-wrap text-sm leading-6"
                            style={{ fontFamily: '"Times New Roman", Times, serif' }}
                          >
                            {page.text}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre
                      className="whitespace-pre-wrap text-sm leading-6"
                      style={{ fontFamily: '"Times New Roman", Times, serif' }}
                    >
                      {ocrText}
                    </pre>
                  )}
                </div>
              </div>
            ) : null}

            {!ocrText && !textQuery.isLoading && completedJob ? (
              <Alert>
                <AlertDescription>
                  OCR đã có job hoàn thành nhưng chưa lấy được text. Bấm “Tải lại” để kiểm tra lại.
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}