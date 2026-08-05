"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { OcrSearchResult } from "@/features/ocr/types";
import {
  getOcrFileName,
  getOcrSearchSnippet,
  normalizeOcrSearchResults,
} from "@/features/ocr/utils/ocr-utils";
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
import { Input } from "@/components/ui/input";

interface OcrSearchCardProps {
  onSearch: (query: string) => Promise<OcrSearchResult>;
  isSearching?: boolean;
  error?: unknown;
  result?: OcrSearchResult | null;
}

export function OcrSearchCard({
  onSearch,
  isSearching,
  error,
  result,
}: OcrSearchCardProps) {
  const [query, setQuery] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = query.trim();

    if (!keyword) return;

    await onSearch(keyword);
  }

  const results = normalizeOcrSearchResults(result);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tìm kiếm nội dung OCR</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tìm theo chữ đã OCR trong các file PDF.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(
                error,
                "Không tìm kiếm được OCR.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập nội dung cần tìm trong OCR..."
          />

          <Button type="submit" disabled={!query.trim() || isSearching}>
            <Search className="mr-2 h-4 w-4" />
            {isSearching ? "Đang tìm..." : "Tìm kiếm"}
          </Button>
        </form>

        {result ? (
          <div className="space-y-3">
            <Badge variant="secondary">
              Kết quả: {results.length}
            </Badge>

            {results.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Không tìm thấy nội dung OCR phù hợp.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {results.map((item, index) => (
                  <div key={`${item.digital_file_id || item.digital_file}-${index}`} className="rounded-md border p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {getOcrFileName(item)}
                      </Badge>

                      {item.profile_code ? (
                        <Badge variant="outline">
                          Hồ sơ: {item.profile_code}
                        </Badge>
                      ) : null}

                      {item.document_code ? (
                        <Badge variant="outline">
                          VB: {item.document_code}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-3 font-medium">
                      {item.profile_title || item.document_title || "Kết quả OCR"}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {getOcrSearchSnippet(item)}
                    </p>

                    {item.profile_id || item.profile ? (
                      <Button asChild className="mt-3" size="sm" variant="outline">
                        <Link href={`/ho-so/${item.profile_id || item.profile}`}>
                          Xem hồ sơ
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}