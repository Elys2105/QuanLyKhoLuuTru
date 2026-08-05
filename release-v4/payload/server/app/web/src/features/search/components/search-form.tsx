"use client";

import { RotateCcw, Search } from "lucide-react";
import { useState } from "react";

import type { SearchProfileParams } from "@/features/search/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HasPdfFilter = "all" | "true" | "false";

interface SearchFormProps {
  isLoading?: boolean;
  onSearch: (params: SearchProfileParams) => void;
  onReset: () => void;
}

interface SearchFormValues {
  q: string;
  profile_code: string;
  year: string;
  document_code: string;
  box_number: string;
  file_number: string;
  has_pdf: HasPdfFilter;
}

const DEFAULT_VALUES: SearchFormValues = {
  q: "",
  profile_code: "",
  year: "",
  document_code: "",
  box_number: "",
  file_number: "",
  has_pdf: "all",
};

function toSearchParams(values: SearchFormValues): SearchProfileParams {
  return {
    q: values.q.trim() || undefined,
    profile_code: values.profile_code.trim() || undefined,
    year: values.year.trim() || undefined,
    document_code: values.document_code.trim() || undefined,
    box_number: values.box_number.trim() || undefined,
    file_number: values.file_number.trim() || undefined,
    has_pdf: values.has_pdf === "all" ? undefined : values.has_pdf === "true",
    page: 1,
    page_size: 20,
  };
}

export function SearchForm({
  isLoading = false,
  onSearch,
  onReset,
}: SearchFormProps) {
  const [values, setValues] = useState<SearchFormValues>(DEFAULT_VALUES);

  function updateValue<K extends keyof SearchFormValues>(
    key: K,
    value: SearchFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(toSearchParams(values));
  }

  function handleReset() {
    setValues(DEFAULT_VALUES);
    onSearch({
      page: 1,
      page_size: 20,
    });
    onReset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điều kiện tra cứu</CardTitle>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-12">
              <Label htmlFor="q">Từ khóa tra cứu</Label>

              <Input
                id="q"
                value={values.q}
                onChange={(event) => updateValue("q", event.target.value)}
                placeholder="Nhập tên hồ sơ, tên bản ghi, số/ký hiệu, nội dung bản ghi hoặc nội dung OCR"
                autoComplete="off"
              />

              <p className="text-xs text-muted-foreground">
                Để trống rồi bấm Tìm kiếm để hiển thị tất cả hồ sơ.
              </p>
            </div>

            <div className="space-y-2 lg:col-span-4">
              <Label htmlFor="profile_code">Ký hiệu hồ sơ</Label>

              <Input
                id="profile_code"
                value={values.profile_code}
                onChange={(event) =>
                  updateValue("profile_code", event.target.value)
                }
                placeholder="Ví dụ: A29.125"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="year">Năm</Label>

              <Input
                id="year"
                value={values.year}
                onChange={(event) => updateValue("year", event.target.value)}
                placeholder="2025"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="document_code">Số/ký hiệu bản ghi</Label>

              <Input
                id="document_code"
                value={values.document_code}
                onChange={(event) =>
                  updateValue("document_code", event.target.value)
                }
                placeholder="Ví dụ: 29-BC/VPĐU"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="has_pdf">Có PDF</Label>

              <Select
                value={values.has_pdf}
                onValueChange={(value: HasPdfFilter) =>
                  updateValue("has_pdf", value)
                }
              >
                <SelectTrigger id="has_pdf">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="true">Có PDF</SelectItem>
                  <SelectItem value="false">Chưa có PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="box_number">Hộp số</Label>

              <Input
                id="box_number"
                value={values.box_number}
                onChange={(event) =>
                  updateValue("box_number", event.target.value)
                }
                placeholder="Ví dụ: 25"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="file_number">Tệp số</Label>

              <Input
                id="file_number"
                value={values.file_number}
                onChange={(event) =>
                  updateValue("file_number", event.target.value)
                }
                placeholder="Ví dụ: 07"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? "Đang tìm..." : "Tìm kiếm"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleReset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Đặt lại
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
