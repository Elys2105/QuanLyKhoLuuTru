"use client";

import { useEffect, useRef, useState } from "react";

import { getOcrProgressForDigitalFileApi } from "@/features/ocr/api";
import {
  OCR_COMPLETION_WATCH_EVENT,
  readOcrCompletionWatches,
  removeOcrCompletionWatch,
  type OcrCompletionWatch,
} from "@/features/ocr/completion-watch";
import type { OcrJob } from "@/features/ocr/types";

const POLL_MS = 2000;
const DISPLAY_MS = 5000;

function getProfileLabel(watch: OcrCompletionWatch, job: OcrJob) {
  if (watch.profileLabel && watch.profileLabel !== "Hồ sơ") {
    return watch.profileLabel;
  }

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

function normalizeJobs(value: unknown): OcrJob[] {
  if (Array.isArray(value)) {
    return value as OcrJob[];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.results)) {
      return record.results as OcrJob[];
    }

    if (Array.isArray(record.data)) {
      return record.data as OcrJob[];
    }
  }

  return [];
}

export function OcrCompletionNotifier() {
  const [queue, setQueue] = useState<string[]>([]);
  const checkingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (cancelled || checkingRef.current) return;

      checkingRef.current = true;

      try {
        const watches = readOcrCompletionWatches();
        if (watches.length === 0) return;

        const grouped = new Map<string, OcrCompletionWatch[]>();

        for (const watch of watches) {
          const group = grouped.get(watch.digitalFileId) ?? [];
          group.push(watch);
          grouped.set(watch.digitalFileId, group);
        }

        for (const [digitalFileId, fileWatches] of grouped.entries()) {
          let raw: unknown;

          try {
            raw = await getOcrProgressForDigitalFileApi(digitalFileId);
          } catch {
            continue;
          }

          const jobs = normalizeJobs(raw);

          for (const watch of fileWatches) {
            const job = jobs.find((item) => String(item.id) === watch.jobId);
            if (!job) continue;

            const status = String(job.status ?? "").toUpperCase();

            if (status === "COMPLETED" || status === "SUCCESS") {
              const label = getProfileLabel(watch, job);

              removeOcrCompletionWatch(watch.jobId);
              setQueue((current) => [
                ...current,
                `OCR hoàn tất — ${label}`,
              ]);
            } else if (status === "FAILED") {
              removeOcrCompletionWatch(watch.jobId);
            }
          }
        }
      } finally {
        checkingRef.current = false;
      }
    };

    const onWatchChange = () => {
      void check();
    };

    void check();
    const timer = window.setInterval(() => {
      void check();
    }, POLL_MS);

    window.addEventListener(OCR_COMPLETION_WATCH_EVENT, onWatchChange);
    window.addEventListener("storage", onWatchChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(OCR_COMPLETION_WATCH_EVENT, onWatchChange);
      window.removeEventListener("storage", onWatchChange);
    };
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;

    const timer = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, DISPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [queue]);

  const message = queue[0];
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-[100] max-w-[min(92vw,520px)] rounded-lg border bg-background px-4 py-3 text-sm font-medium shadow-lg"
    >
      {message}
    </div>
  );
}
