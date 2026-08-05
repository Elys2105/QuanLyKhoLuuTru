"use client";

import {
  Copy,
  Download,
  ImageIcon,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { OcrTextResult } from "@/features/ocr/types";
import {
  getOcrMessage,
  getOcrStatus,
  getOcrText,
} from "@/features/ocr/utils/ocr-utils";
import {
  apiClient,
  getApiErrorMessage,
} from "@/lib/api/client";

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

interface OcrTextCardProps {
  result?: OcrTextResult | null;
  digitalFileId?: string | number | null;
  isLoading?: boolean;
  error?: unknown;
  onRefresh?: () => void;
}

type OcrPage = {
  pageNumber: number;
  text: string;
};

function parsePages(text: string): OcrPage[] {
  const normalized = (text || "").replace(/\r\n?/g, "\n").trim();

  if (!normalized) return [];

  const regex = /^=+\s*PAGE\s+(\d+)\s*=+$/gim;
  const matches = Array.from(normalized.matchAll(regex));

  if (matches.length === 0) {
    return [{ pageNumber: 1, text: normalized }];
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

function getResultData(result?: OcrTextResult | null) {
  const raw = result as unknown as Record<string, unknown> | null | undefined;

  if (!raw) return null;

  const nestedData = raw.data as Record<string, unknown> | undefined;

  return nestedData ?? raw;
}

function getResultDigitalFileId(result?: OcrTextResult | null) {
  const data = getResultData(result);

  if (!data) return null;

  const value =
    data.digital_file_id ??
    data.digital_file ??
    data.file_id ??
    null;

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return null;
}

function downloadTextFile(text: string) {
  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "ocr-text.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function OcrPageImage({
  digitalFileId,
  page,
}: {
  digitalFileId: string | number;
  page: OcrPage;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let currentObjectUrl: string | null = null;

    async function loadPageImage() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await apiClient.get(
          `/api/ocr/digital-files/${digitalFileId}/page-image/${page.pageNumber}/`,
          {
            responseType: "blob",
          },
        );

        if (cancelled) return;

        currentObjectUrl = URL.createObjectURL(response.data as Blob);
        setObjectUrl(currentObjectUrl);
      } catch (error) {
        if (cancelled) return;

        setErrorMessage(
          getApiErrorMessage(error, "Không tải được ảnh trang OCR."),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPageImage();

    return () => {
      cancelled = true;

      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [digitalFileId, page.pageNumber]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>OCR trang {page.pageNumber}</span>
        <span>{page.text.length} ký tự OCR</span>
      </div>

      <div className="relative mx-auto w-full max-w-[210mm] bg-white shadow-sm ring-1 ring-border">
        {isLoading ? (
          <Skeleton className="h-[720px] w-full" />
        ) : errorMessage ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>

            <pre
              className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {page.text}
            </pre>
          </div>
        ) : objectUrl ? (
          <img
            src={objectUrl}
            alt={`OCR trang ${page.pageNumber}`}
            className="block h-auto w-full select-text"
          />
        ) : null}

        <div
          className="sr-only whitespace-pre-wrap"
          data-ocr-page={page.pageNumber}
          data-ocr-search-text="true"
        >
          {page.text}
        </div>
      </div>
    </div>
  );
}

function OcrTextDebug({
  pages,
}: {
  pages: OcrPage[];
}) {
  return (
    <div className="space-y-4">
      {pages.map((page) => (
        <div key={page.pageNumber} className="rounded-xl border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="text-sm font-semibold">
              Text OCR trang {page.pageNumber}
            </div>

            <Badge variant="outline">
              {page.text.length} ký tự
            </Badge>
          </div>

          <pre
            className="max-h-[560px] overflow-auto whitespace-pre-wrap p-4 text-sm leading-6"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {page.text}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function OcrTextCard({
  result,
  digitalFileId,
  isLoading,
  error,
  onRefresh,
}: OcrTextCardProps) {
  const [copied, setCopied] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const text = result ? getOcrText(result) : "";
  const status = result ? getOcrStatus(result) : "-";
  const message = result ? getOcrMessage(result) : "";
  const pages = useMemo(() => parsePages(text), [text]);
  const hasText = text.trim().length > 0;
  const resultDigitalFileId = getResultDigitalFileId(result);
  const safeDigitalFileId = digitalFileId || resultDigitalFileId;

  async function handleCopy() {
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function handleDownloadTxt() {
    if (!text) return;

    downloadTextFile(text);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" />
              Khối OCR
            </CardTitle>

            <p className="mt-1 text-xs text-muted-foreground">
              Hiển thị ảnh từng trang đã OCR để giống PDF 100%; text OCR vẫn lưu trong block để tìm kiếm/copy.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={hasText ? "secondary" : "outline"}>
              {status}
            </Badge>

            {hasText ? (
              <Badge variant="outline">
                {pages.length} trang
              </Badge>
            ) : null}

            {safeDigitalFileId ? (
              <Badge variant="outline">
                File #{safeDigitalFileId}
              </Badge>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant={showRawText ? "default" : "outline"}
              onClick={() => setShowRawText((value) => !value)}
              disabled={!hasText}
            >
              <Search className="mr-2 h-4 w-4" />
              {showRawText ? "Ẩn text" : "Text OCR"}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={!onRefresh || isLoading}
            >
              <RefreshCw
                className={
                  isLoading
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
              onClick={handleDownloadTxt}
              disabled={!hasText}
            >
              <Download className="mr-2 h-4 w-4" />
              Tải text
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={!hasText}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Đã copy" : "Copy"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(error, "Không tải được text OCR.")}
            </AlertDescription>
          </Alert>
        ) : null}

        {message ? (
          <Alert className="py-2">
            <AlertDescription className="text-xs">
              {message}
            </AlertDescription>
          </Alert>
        ) : null}

        {hasText ? (
          <div
            className="sr-only whitespace-pre-wrap"
            data-ocr-search-text="all"
          >
            {text}
          </div>
        ) : null}

        <div className="max-h-[calc(100vh-220px)] overflow-auto rounded-xl border bg-neutral-100 p-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="mx-auto h-[720px] w-full max-w-[210mm]" />
            </div>
          ) : hasText && safeDigitalFileId ? (
            showRawText ? (
              <OcrTextDebug pages={pages} />
            ) : (
              <div className="space-y-8">
                {pages.map((page) => (
                  <OcrPageImage
                    key={page.pageNumber}
                    digitalFileId={safeDigitalFileId}
                    page={page}
                  />
                ))}
              </div>
            )
          ) : hasText ? (
            <OcrTextDebug pages={pages} />
          ) : (
            <Alert>
              <AlertDescription>
                Chưa có text OCR. Hãy chạy OCR hoặc tải lại sau khi backend xử lý xong.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}