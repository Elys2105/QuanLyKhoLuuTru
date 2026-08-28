import type { OcrJob } from "@/features/ocr/types";

export const OCR_COMPLETION_WATCH_EVENT = "qlklt:ocr-completion-watch-change";

const STORAGE_KEY = "qlklt:ocr-completion-watches:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface OcrCompletionWatch {
  digitalFileId: string;
  jobId: string;
  profileLabel: string;
  createdAt: number;
}

function hasWindow() {
  return typeof window !== "undefined";
}

function profileLabelFromJob(job?: OcrJob | null) {
  if (!job) return "Hồ sơ";

  const code = String(job.profile_code ?? "").trim();
  if (code) return code;

  const title = String(job.profile_title ?? "").trim();
  if (title) return title;

  if (job.profile !== undefined && job.profile !== null && String(job.profile).trim()) {
    return `Hồ sơ #${job.profile}`;
  }

  const documentCode = String(job.document_code ?? "").trim();
  if (documentCode) return documentCode;

  const documentTitle = String(job.document_title ?? "").trim();
  if (documentTitle) return documentTitle;

  if (job.document !== undefined && job.document !== null && String(job.document).trim()) {
    return `Hồ sơ #${job.document}`;
  }

  return "Hồ sơ";
}

function writeWatches(watches: OcrCompletionWatch[]) {
  if (!hasWindow()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watches));
  window.dispatchEvent(new Event(OCR_COMPLETION_WATCH_EVENT));
}

export function readOcrCompletionWatches(): OcrCompletionWatch[] {
  if (!hasWindow()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    writeWatches([]);
    return [];
  }

  const now = Date.now();
  const valid = parsed.filter((item): item is OcrCompletionWatch => {
    if (!item || typeof item !== "object") return false;
    const value = item as Partial<OcrCompletionWatch>;

    return (
      typeof value.digitalFileId === "string" &&
      typeof value.jobId === "string" &&
      typeof value.profileLabel === "string" &&
      typeof value.createdAt === "number" &&
      now - value.createdAt <= MAX_AGE_MS
    );
  });

  if (valid.length !== parsed.length) {
    writeWatches(valid);
  }

  return valid;
}

export function registerOcrCompletionWatch(
  digitalFileId: string | number,
  job?: OcrJob | null,
) {
  if (!hasWindow() || !job?.id) return;

  const jobId = String(job.id);
  const current = readOcrCompletionWatches();
  const next = current.filter((item) => item.jobId !== jobId);

  next.push({
    digitalFileId: String(digitalFileId),
    jobId,
    profileLabel: profileLabelFromJob(job),
    createdAt: Date.now(),
  });

  writeWatches(next);
}

export function removeOcrCompletionWatch(jobId: string) {
  if (!hasWindow()) return;

  const current = readOcrCompletionWatches();
  writeWatches(current.filter((item) => item.jobId !== jobId));
}
