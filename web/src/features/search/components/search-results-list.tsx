import type { SearchProfileResult } from "@/features/search/types";
import { SearchEmptyState } from "@/features/search/components/search-empty-state";
import { SearchResultCard } from "@/features/search/components/search-result-card";

import { Badge } from "@/components/ui/badge";

interface SearchResultsListProps {
  results: SearchProfileResult[];
  total: number;
  hasSearched: boolean;
}

export function SearchResultsList({
  results,
  total,
  hasSearched,
}: SearchResultsListProps) {
  if (results.length === 0) {
    return <SearchEmptyState hasSearched={hasSearched} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">
          Kết quả tra cứu
        </h3>

        <Badge variant="secondary">
          {total} hồ sơ
        </Badge>
      </div>

      <div className="space-y-3">
        {results.map((profile) => (
          <SearchResultCard
            key={profile.id}
            profile={profile}
          />
        ))}
      </div>
    </div>
  );
}