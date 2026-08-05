"use client";

import { useEffect, useState, type FormEvent } from "react";

import type {
  Document,
  DocumentFormValues,
  DocumentPayload,
} from "@/features/documents/types";
import {
  buildDocumentPayload,
  createDocumentFormValuesFromDocument,
  DEFAULT_DOCUMENT_FORM_VALUES,
  validateDocumentForm,
} from "@/features/documents/utils/document-form-utils";
import { RecordFileUploadPanel } from "@/features/digital-files/components/record-file-upload-panel";
import type { Profile } from "@/features/profiles/types";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDocument?: Document | null;
  fixedProfileId?: string | number | null;
  profiles?: Profile[];
  isSaving?: boolean;
  error?: unknown;
  onSubmit: (
    payload: DocumentPayload,
    editingDocument?: Document | null,
  ) => Promise<void>;
  onUploaded?: () => void;
}

const DOCUMENT_TYPE_OPTIONS = [
  "Công văn",
  "Báo cáo",
  "Quyết định",
  "Tờ trình",
  "Kế hoạch",
  "Thông báo",
  "Biên bản",
  "Giấy mời",
  "Khác",
];

const COPY_TYPE_OPTIONS = [
  "Bản chính",
  "Bản sao",
  "Bản dự thảo",
  "Bản trích sao",
  "Khác",
];

const SECURITY_LEVEL_OPTIONS = [
  "Thường",
  "Mật",
  "Tối mật",
  "Tuyệt mật",
];

function getOptions(baseOptions: string[], currentValue: string): string[] {
  const value = currentValue.trim();

  if (!value || baseOptions.includes(value)) {
    return baseOptions;
  }

  return [value, ...baseOptions];
}

function updateFormValue<K extends keyof DocumentFormValues>(
  values: DocumentFormValues,
  key: K,
  value: DocumentFormValues[K],
): DocumentFormValues {
  return {
    ...values,
    [key]: value,
  };
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  editingDocument,
  fixedProfileId,
  profiles = [],
  isSaving,
  error,
  onSubmit,
  onUploaded,
}: DocumentFormDialogProps) {
  const [values, setValues] = useState<DocumentFormValues>(
    DEFAULT_DOCUMENT_FORM_VALUES,
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (editingDocument) {
      setValues(createDocumentFormValuesFromDocument(editingDocument));
    } else {
      setValues({
        ...DEFAULT_DOCUMENT_FORM_VALUES,
        profile: fixedProfileId ? String(fixedProfileId) : "",
      });
    }

    setFormError(null);
  }, [open, editingDocument, fixedProfileId]);

  function setValue<K extends keyof DocumentFormValues>(
    key: K,
    value: DocumentFormValues[K],
  ) {
    setValues((currentValues) =>
      updateFormValue(currentValues, key, value),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateDocumentForm(values, fixedProfileId);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    const payload = buildDocumentPayload(values, fixedProfileId);
    await onSubmit(payload, editingDocument);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {editingDocument ? "Sửa bản ghi" : "Thêm bản ghi"}
          </DialogTitle>

          <p className="text-sm text-muted-foreground">
            Nhập thông tin biên mục văn bản/bản ghi thuộc hồ sơ.
          </p>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(error, "Không lưu được bản ghi.")}
                </AlertDescription>
              </Alert>
            ) : null}

            {!fixedProfileId ? (
              <div className="space-y-2 rounded-xl border bg-card p-4">
                <Label>Hồ sơ *</Label>
                <Select
                  value={values.profile}
                  onValueChange={(value) => setValue("profile", value)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn hồ sơ chứa bản ghi" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={String(profile.id)}>
                        {profile.profile_code || profile.id} - {profile.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/25 px-4 py-3">
                <div className="text-sm font-semibold">
                  Thông tin định danh
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Mã, số ký hiệu, loại văn bản và tiêu đề chính.
                </div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Mã định danh tài liệu</Label>
                  <Input
                    className="h-9"
                    value={values.document_identifier}
                    onChange={(event) =>
                      setValue("document_identifier", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Số thứ tự văn bản trong hồ sơ</Label>
                  <Input
                    className="h-9"
                    inputMode="numeric"
                    value={values.order_in_profile}
                    onChange={(event) =>
                      setValue("order_in_profile", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tên thể loại văn bản</Label>
                  <Select
                    value={values.document_type}
                    onValueChange={(value) => setValue("document_type", value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Chọn thể loại" />
                    </SelectTrigger>
                    <SelectContent>
                      {getOptions(DOCUMENT_TYPE_OPTIONS, values.document_type).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Số/ký hiệu văn bản
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-9"
                    value={values.document_code}
                    onChange={(event) =>
                      setValue("document_code", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Số văn bản</Label>
                  <Input
                    className="h-9"
                    value={values.document_number}
                    onChange={(event) =>
                      setValue("document_number", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Ký hiệu văn bản</Label>
                  <Input
                    className="h-9"
                    value={values.document_symbol}
                    onChange={(event) =>
                      setValue("document_symbol", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>
                    Tiêu đề/Tên gọi văn bản
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-9"
                    value={values.title}
                    onChange={(event) => setValue("title", event.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/25 px-4 py-3">
                <div className="text-sm font-semibold">
                  Nội dung và ban hành
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Ngày văn bản, tác giả, người ký và trích yếu.
                </div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Ngày/tháng/năm văn bản</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={values.document_date}
                    onChange={(event) =>
                      setValue("document_date", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tác giả/Cơ quan ban hành</Label>
                  <Input
                    className="h-9"
                    value={values.author}
                    onChange={(event) => setValue("author", event.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Người ký</Label>
                  <Input
                    className="h-9"
                    value={values.signer}
                    onChange={(event) => setValue("signer", event.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Loại bản</Label>
                  <Select
                    value={values.copy_type}
                    onValueChange={(value) => setValue("copy_type", value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Chọn loại bản" />
                    </SelectTrigger>
                    <SelectContent>
                      {getOptions(COPY_TYPE_OPTIONS, values.copy_type).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Trích yếu nội dung</Label>
                  <Textarea
                    value={values.summary}
                    onChange={(event) => setValue("summary", event.target.value)}
                    disabled={isSaving}
                    rows={4}
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/25 px-4 py-3">
                <div className="text-sm font-semibold">
                  Trang, ngôn ngữ và bảo mật
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Số trang, trang số, ngôn ngữ và độ mật.
                </div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Từ trang</Label>
                  <Input
                    className="h-9"
                    inputMode="numeric"
                    value={values.page_start}
                    onChange={(event) =>
                      setValue("page_start", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Đến trang</Label>
                  <Input
                    className="h-9"
                    inputMode="numeric"
                    value={values.page_end}
                    onChange={(event) =>
                      setValue("page_end", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Số lượng trang</Label>
                  <Input
                    className="h-9"
                    inputMode="numeric"
                    value={values.page_count}
                    onChange={(event) =>
                      setValue("page_count", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Trang số</Label>
                  <Input
                    className="h-9"
                    value={values.page_number}
                    onChange={(event) =>
                      setValue("page_number", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Ngôn ngữ</Label>
                  <Input
                    className="h-9"
                    value={values.language}
                    onChange={(event) => setValue("language", event.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Độ mật</Label>
                  <Select
                    value={values.security_level}
                    onValueChange={(value) => setValue("security_level", value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Chọn độ mật" />
                    </SelectTrigger>
                    <SelectContent>
                      {getOptions(SECURITY_LEVEL_OPTIONS, values.security_level).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/25 px-4 py-3">
                <div className="text-sm font-semibold">
                  File và ghi chú
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Thông tin file đính kèm, chữ ký số và ghi chú.
                </div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tệp/tập tin đính kèm văn bản</Label>
                  <Input
                    className="h-9"
                    value={values.attachment_note}
                    onChange={(event) =>
                      setValue("attachment_note", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Chữ ký số</Label>
                  <Input
                    className="h-9"
                    value={values.digital_signature}
                    onChange={(event) =>
                      setValue("digital_signature", event.target.value)
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    value={values.notes}
                    onChange={(event) => setValue("notes", event.target.value)}
                    disabled={isSaving}
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {editingDocument ? (
              <RecordFileUploadPanel
                profileId={String(
                  fixedProfileId ||
                    editingDocument.profile_id ||
                    editingDocument.profile,
                )}
                documentId={editingDocument.id}
                onUploaded={() => onUploaded?.()}
              />
            ) : (
              <section className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b bg-muted/25 px-4 py-3">
                  <div className="text-sm font-semibold">
                    File đính kèm bản ghi
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Lưu bản ghi trước, sau đó mở Sửa bản ghi để chọn PDF/Word/Excel từ máy.
                  </div>
                </div>

                <div className="p-4 text-sm text-muted-foreground">
                  Bản ghi mới cần có mã và tiêu đề trước khi gắn file. Sau khi lưu, nút chọn file sẽ hiện tại đây.
                </div>
              </section>
            )}

          </div>

          <DialogFooter className="border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Đóng
            </Button>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Đang lưu..." : "Lưu bản ghi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}