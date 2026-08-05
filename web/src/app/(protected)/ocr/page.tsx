"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getDigitalFilesApi } from "@/features/digital-files/api";
import { OcrRunCard } from "@/features/ocr/components/ocr-run-card";
import { OcrSearchCard } from "@/features/ocr/components/ocr-search-card";
import { OcrTextCard } from "@/features/ocr/components/ocr-text-card";
import {
  useOcrSearch,
  useOcrText,
  useRunOcr,
} from "@/features/ocr/hooks/use-ocr";
import type { OcrRunResult } from "@/features/ocr/types";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function OcrPage() {
  const [selectedDigitalFileId, setSelectedDigitalFileId] = useState("");
  const [runResult, setRunResult] = useState<OcrRunResult | null>(null);

  const digitalFilesQuery = useQuery({
    queryKey: ["digital-files", "ocr-page"],
    queryFn: () =>
      getDigitalFilesApi({
        page: 1,
        page_size: 1000,
      }),
  });

  const digitalFiles = digitalFilesQuery.data ?? [];

  useEffect(() => {
    if (selectedDigitalFileId) return;

    const firstFile = digitalFiles[0];

    if (firstFile) {
      setSelectedDigitalFileId(String(firstFile.id));
    }
  }, [digitalFiles, selectedDigitalFileId]);

  const ocrTextQuery = useOcrText(selectedDigitalFileId);
  const runOcrMutation = useRunOcr();
  const searchMutation = useOcrSearch();

  async function handleRunOcr() {
    if (!selectedDigitalFileId) return;

    const result = await runOcrMutation.mutateAsync(selectedDigitalFileId);
    setRunResult(result);

    await ocrTextQuery.refetch();
  }

  if (digitalFilesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">
          OCR PDF
        </h2>

        <p className="text-sm text-muted-foreground">
          Chạy OCR cho PDF, xem text đã nhận dạng và tìm kiếm theo nội dung OCR.
        </p>
      </div>

      {digitalFilesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              digitalFilesQuery.error,
              "Không tải được danh sách file PDF.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="run" className="space-y-4">
        <TabsList>
          <TabsTrigger value="run">Chạy OCR</TabsTrigger>
          <TabsTrigger value="search">Tìm kiếm OCR</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-6">
          <OcrRunCard
            digitalFiles={digitalFiles}
            selectedDigitalFileId={selectedDigitalFileId}
            onSelectedDigitalFileIdChange={(id) => {
              setSelectedDigitalFileId(id);
              setRunResult(null);
            }}
            onRunOcr={handleRunOcr}
            isRunning={runOcrMutation.isPending}
            runResult={runResult}
            error={runOcrMutation.error}
          />

          <OcrTextCard
            digitalFileId={selectedDigitalFileId}
            result={ocrTextQuery.data}
            isLoading={ocrTextQuery.isLoading || ocrTextQuery.isFetching}
            error={ocrTextQuery.error}
            onRefresh={() => ocrTextQuery.refetch()}
          />
        </TabsContent>

        <TabsContent value="search">
          <OcrSearchCard
            onSearch={(query) => searchMutation.mutateAsync(query)}
            isSearching={searchMutation.isPending}
            error={searchMutation.error}
            result={searchMutation.data ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}