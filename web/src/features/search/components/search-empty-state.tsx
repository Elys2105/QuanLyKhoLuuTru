import { SearchX } from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface SearchEmptyStateProps {
  hasSearched: boolean;
}

export function SearchEmptyState({
  hasSearched,
}: SearchEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <SearchX className="h-10 w-10 text-muted-foreground" />

        <h3 className="mt-4 text-base font-semibold">
          {hasSearched
            ? "Không tìm thấy hồ sơ phù hợp"
            : "Nhập điều kiện để tra cứu hồ sơ"}
        </h3>

        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {hasSearched
            ? "Hãy thử đổi từ khóa, bỏ bớt bộ lọc năm/hộp/tệp hoặc tìm theo ký hiệu hồ sơ."
            : "Bạn có thể tìm theo từ khóa tổng, ký hiệu hồ sơ, tên hồ sơ, số văn bản, năm, hộp hoặc tệp."}
        </p>
      </CardContent>
    </Card>
  );
}