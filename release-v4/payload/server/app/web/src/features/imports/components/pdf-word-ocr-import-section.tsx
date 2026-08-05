"use client";

import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileText,
  ScanText,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils/format";

type LocalImportFileKind = "pdf" | "word" | "other";

type LocalImportFile = {
  id: string;
  file: File;
  objectUrl: string;
  kind: LocalImportFileKind;
};

function getFileKind(file: File): LocalImportFileKind {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return "pdf";
  }

  if (
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    file.type.includes("word") ||
    file.type.includes("officedocument.wordprocessingml")
  ) {
    return "word";
  }

  return "other";
}

function getKindLabel(kind: LocalImportFileKind) {
  if (kind === "pdf") return "PDF";
  if (kind === "word") return "Word";

  return "File";
}

function LocalFileBlock({
  item,
  index,
  onRemove,
}: {
  item: LocalImportFile;
  index: number;
  onRemove: (id: string) => void;
}) {
  const sizeLabel = formatFileSize(item.file.size);
  const kindLabel = getKindLabel(item.kind);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Block {index + 1}</Badge>
              <Badge variant="outline">{kindLabel}</Badge>
              <Badge variant="outline">{sizeLabel}</Badge>
            </div>

            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.file.name}</span>
            </CardTitle>

            <CardDescription className="mt-2">
              File được giữ riêng thành một block để kiểm tra trước khi tạo/gắn bản ghi.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={item.objectUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Mở file
              </a>
            </Button>

            <Button asChild size="sm" variant="outline">
              <a href={item.objectUrl} download={item.file.name}>
                <Download className="mr-2 h-4 w-4" />
                Tải file
              </a>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Bỏ
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[5fr_7fr]">
          <div className="border-b p-4 xl:border-b-0 xl:border-r">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold">Thông tin file</div>
                <div className="mt-3 grid gap-3 text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="text-muted-foreground">Tên file</span>
                    <span className="break-all font-medium">{item.file.name}</span>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="text-muted-foreground">Định dạng</span>
                    <span className="font-medium">{kindLabel}</span>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="text-muted-foreground">Dung lượng</span>
                    <span className="font-medium">{sizeLabel}</span>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="text-muted-foreground">Trạng thái</span>
                    <span className="font-medium">
                      {item.kind === "pdf"
                        ? "Sẵn sàng đưa sang OCR / tạo bản ghi"
                        : "Sẵn sàng kiểm tra và gắn bản ghi"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <ScanText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold">
                      OCR và tạo bản ghi
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Luồng OCR đã chốt ở bước 21.8 được giữ nguyên. Tại đây chỉ gom file
                      thành block nhập liệu; khi cần xử lý sâu, mở OCR hoặc danh sách bản ghi.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild size="sm">
                      </Button>

                      <Button asChild size="sm" variant="outline">
                        <Link href="/tai-lieu">
                          Mở bản ghi
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>

                      <Button asChild size="sm" variant="outline">
                        <Link href="/ho-so">
                          Chọn hồ sơ
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {item.kind === "word" ? (
                <div className="rounded-xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">
                  Word không preview trực tiếp ổn định trong trình duyệt. Block này giữ đúng file gốc;
                  mở file bằng Word/LibreOffice hoặc gắn vào bản ghi sau khi kiểm tra.
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-[520px] bg-muted/20">
            {item.kind === "pdf" ? (
              <iframe
                title={item.file.name}
                src={item.objectUrl}
                className="h-[720px] w-full border-0"
              />
            ) : (
              <div className="flex h-full min-h-[520px] items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-4 text-base font-semibold">
                    {kindLabel} được giữ thành block riêng
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    File gốc vẫn được giữ nguyên định dạng. Hãy mở file để kiểm tra nội dung,
                    sau đó tạo hoặc gắn vào bản ghi phù hợp.
                  </p>

                  <Button asChild className="mt-5">
                    <a href={item.objectUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Mở file
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PdfWordOcrImportSection() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<LocalImportFile[]>([]);

  const totalSize = useMemo(() => {
    return items.reduce((sum, item) => sum + item.file.size, 0);
  }, [items]);

  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    };
  }, [items]);

  function handleChooseFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const nextItems = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      objectUrl: URL.createObjectURL(file),
      kind: getFileKind(file),
    }));

    setItems((current) => [...current, ...nextItems]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleRemove(id: string) {
    setItems((current) => {
      const removed = current.find((item) => item.id === id);

      if (removed) {
        URL.revokeObjectURL(removed.objectUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UploadCloud className="h-5 w-5" />
                Nhập PDF / Word / OCR
              </CardTitle>

              <CardDescription className="mt-2 leading-6">
                Bổ sung vào luồng Nhập liệu Excel hiện tại. Mỗi PDF/Word được hiển thị
                thành một block riêng để giữ đúng format file gốc trước khi tạo hoặc gắn bản ghi.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">PDF</Badge>
              <Badge variant="outline">Word</Badge>
              <Badge variant="outline">OCR giữ nguyên 21.8</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) => handleChooseFiles(event.target.files)}
          />

          <div className="rounded-2xl border border-dashed p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  Chọn PDF hoặc Word để kiểm tra theo từng block
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Phần Excel phía trên giữ nguyên. Phần này chỉ bổ sung luồng file rời/OCR.
                </p>
              </div>

              <Button type="button" onClick={() => inputRef.current?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Chọn PDF / Word
              </Button>
            </div>

            {items.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Badge>Tổng file: {items.length}</Badge>
                <Badge variant="outline">
                  Tổng dung lượng: {formatFileSize(totalSize)}
                </Badge>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <LocalFileBlock
              key={item.id}
              item={item}
              index={index}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}