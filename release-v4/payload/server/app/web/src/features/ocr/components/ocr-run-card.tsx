"use client";

import {
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";

import type { DigitalFile } from "@/features/digital-files/types";
import {
  useDeleteOcr,
  useOcrProgress,
} from "@/features/ocr/hooks/use-ocr";
import type {
  OcrJob,
  OcrRunResult,
} from "@/features/ocr/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OcrRunCardProps {
  digitalFiles: DigitalFile[];
  selectedDigitalFileId: string;
  onSelectedDigitalFileIdChange: (value: string) => void;
  onRunOcr: () => Promise<void>;
  isRunning?: boolean;
  runResult?: OcrRunResult | null;
  error?: unknown;
}

function statusOf(job?: OcrJob | null) {
  return String(job?.status || "").toUpperCase();
}

function isActive(job?: OcrJob | null) {
  const status = statusOf(job);
  return status === "PENDING" || status === "RUNNING";
}

function isDone(job?: OcrJob | null) {
  const status = statusOf(job);
  return status === "COMPLETED" || status === "SUCCESS";
}

function isFailed(job?: OcrJob | null) {
  return statusOf(job) === "FAILED";
}

function percentOf(job?: OcrJob | null) {
  const value = Number(job?.progress_percent ?? 0);

  if (Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(100, value));
}

function getFileName(file?: DigitalFile) {
  if (!file) return "Chưa chọn file";
  return file.original_name || `File #${file.id}`;
}

function getActiveJob(jobs: OcrJob[]) {
  const activeJobs = jobs.filter(isActive);

  return (
    activeJobs.find((job) => job.ocr_mode === "quality") ||
    activeJobs.find((job) => job.ocr_mode === "fast") ||
    activeJobs[0] ||
    null
  );
}

function getCompletedJob(jobs: OcrJob[]) {
  const completedJobs = jobs.filter(isDone);

  return (
    completedJobs.find((job) => job.ocr_mode === "quality") ||
    completedJobs.find((job) => job.ocr_mode === "fast") ||
    completedJobs[0] ||
    null
  );
}

function getFailedJob(jobs: OcrJob[]) {
  return jobs.find(isFailed) || null;
}

function getRuntime(job?: OcrJob | null) {
  if (!job?.started_at) return "";

  const start = new Date(job.started_at).getTime();

  if (Number.isNaN(start)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (minutes <= 0) return `${rest}s`;

  return `${minutes}p ${rest}s`;
}

function StatusBadge({ job }: { job?: OcrJob | null }) {
  const status = statusOf(job);

  if (status === "RUNNING") {
    return (
      <Badge className="h-6 animate-pulse">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Đang OCR
      </Badge>
    );
  }

  if (status === "PENDING") {
    return (
      <Badge variant="secondary" className="h-6 animate-pulse">
        <Clock3 className="mr-1 h-3 w-3" />
        Đang chờ
      </Badge>
    );
  }

  if (status === "COMPLETED" || status === "SUCCESS") {
    return (
      <Badge variant="secondary" className="h-6">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Hoàn thành
      </Badge>
    );
  }

  if (status === "FAILED") {
    return (
      <Badge variant="destructive" className="h-6">
        <XCircle className="mr-1 h-3 w-3" />
        Lỗi
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="h-6">
      Chưa OCR
    </Badge>
  );
}

function CompactProgress({
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
        style={{ width: running && percent <= 1 ? "35%" : `${percent}%` }}
      />
    </div>
  );
}

export function OcrRunCard({
  digitalFiles,
  selectedDigitalFileId,
  onSelectedDigitalFileIdChange,
  onRunOcr,
  isRunning,
  runResult,
  error,
}: OcrRunCardProps) {
  const selectedFile = digitalFiles.find(
    (file) => String(file.id) === selectedDigitalFileId,
  );

  const {
    data: progressJobs = [],
    isFetching: isFetchingProgress,
    refetch: refetchProgress,
  } = useOcrProgress(selectedDigitalFileId);

  const deleteOcrMutation = useDeleteOcr();

  const activeJob = getActiveJob(progressJobs);
  const completedJob = getCompletedJob(progressJobs);
  const failedJob = getFailedJob(progressJobs);
  const displayJob = activeJob || completedJob || failedJob || null;

  const backendRunning = Boolean(activeJob);
  const busy = Boolean(isRunning || backendRunning);
  const percent = activeJob ? percentOf(activeJob) : completedJob ? 100 : percentOf(displayJob);
  const runtime = getRuntime(activeJob);
  const pageText = displayJob
    ? `${displayJob.current_page ?? 0}/${displayJob.page_count ?? 0}`
    : "-";

  async function handleDeleteOcr() {
    if (!selectedDigitalFileId) return;

    const ok = window.confirm("Xóa toàn bộ OCR của file này để OCR lại?");

    if (!ok) return;

    await deleteOcrMutation.mutateAsync(selectedDigitalFileId);
    await refetchProgress();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Chạy OCR cho PDF</CardTitle>
        <p className="text-xs text-muted-foreground">
          Chọn PDF đã upload, bấm chạy OCR. Khi đang chạy, thanh tiến trình sẽ tự cập nhật.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
          <Select
            value={selectedDigitalFileId}
            onValueChange={onSelectedDigitalFileIdChange}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Chọn file PDF" />
            </SelectTrigger>

            <SelectContent>
              {digitalFiles.map((file) => (
                <SelectItem key={file.id} value={String(file.id)}>
                  #{file.id} - {getFileName(file)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onRunOcr}
              disabled={!selectedDigitalFileId || busy}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {backendRunning
                ? "Đang OCR..."
                : isRunning
                  ? "Đang gửi..."
                  : completedJob
                    ? "OCR lại"
                    : "Chạy OCR"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => refetchProgress()}
              disabled={!selectedDigitalFileId || isFetchingProgress}
            >
              <RefreshCw
                className={
                  isFetchingProgress
                    ? "mr-2 h-4 w-4 animate-spin"
                    : "mr-2 h-4 w-4"
                }
              />
              Tải lại
            </Button>

            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDeleteOcr}
              disabled={
                !selectedDigitalFileId ||
                backendRunning ||
                deleteOcrMutation.isPending
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </Button>
          </div>
        </div>

        {selectedFile ? (
          <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{getFileName(selectedFile)}</span>
            <Badge variant="outline" className="ml-auto shrink-0">
              ID {selectedFile.id}
            </Badge>
          </div>
        ) : null}

        <div
          className={
            backendRunning
              ? "rounded-xl border border-foreground/50 bg-muted/20 p-3"
              : "rounded-xl border bg-muted/10 p-3"
          }
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge job={displayJob} />

            {completedJob && activeJob ? (
              <Badge variant="outline" className="h-6">
                Đã có text nhanh
              </Badge>
            ) : null}

            {isFetchingProgress ? (
              <Badge variant="outline" className="h-6">
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Đang tải lại
              </Badge>
            ) : null}

            <div className="ml-auto text-sm font-semibold tabular-nums">
              {backendRunning && percent <= 1 ? "Đang xử lý" : `${percent}%`}
            </div>
          </div>

          <CompactProgress percent={percent} running={backendRunning} />

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Job: #{displayJob?.id ?? "-"}</span>
            <span>Mode: {displayJob?.ocr_mode ?? "-"}</span>
            <span>Engine: {displayJob?.engine ?? "-"}</span>
            <span>Trang: {pageText}</span>
            <span>Ký tự: {displayJob?.character_count ?? 0}</span>
            {runtime ? <span>Đã chạy: {runtime}</span> : null}
          </div>
        </div>

        {completedJob && activeJob ? (
          <Alert className="py-2">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              OCR nhanh đã có text. OCR chất lượng cao đang chạy nền để cải thiện kết quả.
            </AlertDescription>
          </Alert>
        ) : null}

        {runResult ? (
          <Alert className="py-2">
            <AlertDescription className="text-xs">
              Đã gửi lệnh OCR. Theo dõi trạng thái ở thanh tiến trình phía trên.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">
              {getApiErrorMessage(error, "Chạy OCR thất bại.")}
            </AlertDescription>
          </Alert>
        ) : null}

        {deleteOcrMutation.error ? (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">
              {getApiErrorMessage(deleteOcrMutation.error, "Xóa OCR thất bại.")}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}