"use client";

import { useState } from "react";

import { SearchForm } from "@/features/search/components/search-form";
import { SearchResultsList } from "@/features/search/components/search-results-list";
import { SearchResultsSkeleton } from "@/features/search/components/search-results-skeleton";
import { useSearchProfiles } from "@/features/search/hooks/use-search-profiles";
import type { SearchProfileParams } from "@/features/search/types";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SearchPage() {
  const [params, setParams] = useState<SearchProfileParams>({
    page: 1,
    page_size: 20,
  });

  const [hasSearched, setHasSearched] = useState(true);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useSearchProfiles(params, hasSearched);

  function handleSearch(nextParams: SearchProfileParams) {
    setParams(nextParams);
    setHasSearched(true);
  }

  function handleReset() {
    setParams({
        page: 1,
      page_size: 20,
    });
    setHasSearched(false);
  }

  const results = data?.results ?? [];
  const total = data?.pagination?.total ?? results.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">
          Tra cứu hồ sơ
        </h2>

        <p className="text-sm text-muted-foreground">
          Tìm theo từ khóa tổng hợp hoặc lọc nhanh theo ký hiệu, năm, số văn bản, hộp, tệp và trạng thái PDF.
        </p>
      </div>

      <SearchForm
        isLoading={isLoading || isFetching}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              error,
              "Không thể tra cứu hồ sơ. Vui lòng thử lại.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading || isFetching ? (
        <SearchResultsSkeleton />
      ) : (
        <SearchResultsList
          results={results}
          total={total}
          hasSearched={hasSearched}
        />
      )}
    </div>
  );
}