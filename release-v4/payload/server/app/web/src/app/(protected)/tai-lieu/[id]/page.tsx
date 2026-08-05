"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Eye,
  FileText,
  Hash,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sparkles,
  Upload,
} from "lucide-react";

import { getDigitalFilesApi } from "@/features/digital-files/api";
import { RecordFileUploadPanel } from "@/features/digital-files/components/record-file-upload-panel";
import { RecordPdfPreviewCard } from "@/features/digital-files/components/record-pdf-preview-card";
import type { DigitalFile } from "@/features/digital-files/types";
import { canPreviewDigitalFile } from "@/features/digital-files/utils/pdf-file-utils";
import {
  getDocumentByIdApi,
  updateDocumentApi,
} from "@/features/documents/api";
import type {
  Document,
  DocumentFormValues,
} from "@/features/documents/types";
import {
  buildDocumentPayload,
  createDocumentFormValuesFromDocument,
  validateDocumentForm,
} from "@/features/documents/utils/document-form-utils";
import { RecordOcrSuggestionCard } from "@/features/ocr/components/record-ocr-suggestion-card";
import { RecordOcrPanel } from "@/features/ocr/components/record-ocr-panel";
import { getApiErrorMessage } from "@/lib/api/client";
import { fallbackText, formatDate } from "@/lib/utils/format";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/auth-store";
type RecordTab = "metadata" | "ocr" | "content";

type InfoItemValue = {
  label: string;
  value: unknown;
  wide?: boolean;
  important?: boolean;
};

function getRelationId(value: unknown) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: string | number | null }).id;
    return id ?? null;
  }

  return null;
}

function getProfileId(record: Document) {
  return getRelationId(record.profile_id ?? record.profile);
}

function getRecordFileId(file: DigitalFile) {
  return getRelationId(file.document_id ?? file.document);
}


function display(value: unknown) {
  return fallbackText(value as string | number | null | undefined);
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;

  const text = String(value).trim();

  return Boolean(text && text !== "-");
}

function pickOcrFile(files: DigitalFile[]) {
  return (
    files.find((file) => canPreviewDigitalFile(file)) ??
    files[0] ??
    null
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="rounded-lg bg-muted p-2">{icon}</span>
        {label}
      </div>
      <div className="mt-2 truncate text-base font-semibold">
        {display(value)}
      </div>
    </div>
  );
}


function RecordMetadataFullGrid({
  items,
}: {
  items: Array<{ label: string; value: string | number | null | undefined }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-background p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </div>
          <div className="mt-1 min-h-6 whitespace-pre-wrap break-words text-sm font-semibold">
            {item.value === null || item.value === undefined || item.value === ""
              ? "\u00A0"
              : String(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}

function InfoGrid({ items }: { items: InfoItemValue[] }) {
  const visibleItems = items.filter(
    (item) => item.important || hasValue(item.value),
  );

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Chưa có thông tin bổ sung.
      </div>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      {visibleItems.map((item) => (
        <div
          key={item.label}
          className={item.wide ? "space-y-1 md:col-span-2" : "space-y-1"}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </div>
          <div className="break-words text-sm font-semibold">
            {display(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
      <Label className="text-[12px] font-medium">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input
        className="h-9"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function EditTextarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5 md:col-span-2">
      <Label className="text-[12px] font-medium">
        {label}
      </Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
      />
    </div>
  );
}

export default function RecordDetailPage() {
  const { user } = useAuthStore();
  const recordDetailRole = String(user?.role ?? "").trim().toUpperCase();
  const isViewerRecordDetailUser = recordDetailRole === "VIEWER";
  const recordDetailBackHref = isViewerRecordDetailUser ? "/tim-kiem" : "/ho-so";
  const recordDetailBackText = isViewerRecordDetailUser ? "Quay lại tra cứu" : "Quay lại hồ sơ";

const userRole = String(user?.role ?? "").toLowerCase();
  const canEditRecordDetail = Boolean(
    user?.is_staff ||
      user?.is_superuser ||
      ["admin", "administrator", "manager", "archivist", "editor", "staff"].includes(userRole),
  );

  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const recordId = params.id;
  const isEditMode = canEditRecordDetail && (searchParams.get("mode") === "edit");

  const [activeTab, setActiveTab] = useState<RecordTab>("metadata");
  const [formValues, setFormValues] = useState<DocumentFormValues | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const recordQuery = useQuery({
    queryKey: ["record-detail", recordId],
    queryFn: () => getDocumentByIdApi(recordId),
    enabled: Boolean(recordId),
  });

  const profileId = recordQuery.data ? getProfileId(recordQuery.data) : null;

  const filesQuery = useQuery({
    queryKey: ["record-digital-files", recordId, profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const files = await getDigitalFilesApi({
        profile: profileId,
        page: 1,
        page_size: 100,
      });

      return files.filter(
        (file) => String(getRecordFileId(file)) === String(recordId),
      );
    },
    enabled: Boolean(recordId && profileId),
  });

  const record = recordQuery.data;
  const recordFiles = filesQuery.data ?? [];
  const ocrFile = pickOcrFile(recordFiles);

  useEffect(() => {
    if (record) {
      setFormValues(createDocumentFormValuesFromDocument(record));
    }
  }, [record]);

  useEffect(() => {
    if (!isEditMode && activeTab === "ocr") {
      setActiveTab("metadata");
    }
  }, [activeTab, isEditMode]);

  const updateMutation = useMutation({
    mutationFn: async (values: DocumentFormValues) => {
      if (!record) throw new Error("Chưa có bản ghi.");

      const validationError = validateDocumentForm(values, getProfileId(record));
      if (validationError) {
        throw new Error(validationError);
      }

      return updateDocumentApi(
        record.id,
        buildDocumentPayload(values, getProfileId(record)),
      );
    },
    onSuccess: async () => {
      setSaveMessage("Đã lưu bản ghi.");
      setFormError(null);

      await queryClient.invalidateQueries({
        queryKey: ["record-detail", recordId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["profile-documents", profileId],
      });

      await recordQuery.refetch();
    },
    onError: (error) => {
      setSaveMessage(null);
      setFormError(getApiErrorMessage(error, "Không lưu được bản ghi."));
    },
  });

  const searchText = useMemo(() => {
    const value = record?.search_text || "";
    return value.trim();
  }, [record]);

  const isLoading = recordQuery.isLoading;
  const isError = recordQuery.isError || filesQuery.isError;
  const firstError = recordQuery.error || filesQuery.error;

  function setField<K extends keyof DocumentFormValues>(
    key: K,
    value: DocumentFormValues[K],
  ) {
    setFormValues((current) => {
      if (!current) return current;

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function handleSave() {
    if (!formValues) return;

    updateMutation.mutate(formValues);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[620px] w-full" />
      </div>
    );
  }

  if (isError || !record) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href={recordDetailBackHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {recordDetailBackText}
          </Link>
        </Button>

        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(firstError, "Không tải được chi tiết bản ghi.")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const note = record.notes || record.note || "";

  const recordAny = record as unknown as Record<string, unknown>;

  const getRecordDisplayValue = (key: string) => {
    const value = recordAny[key];

    if (value === null || value === undefined || value === "") {
      return "";
    }

    return String(value);
  };

  const getFirstRecordDisplayValue = (...keys: string[]) => {
    for (const key of keys) {
      const value = recordAny[key];

      if (value !== null && value !== undefined && value !== "") {
        return String(value);
      }
    }

    return "";
  };

  const getRecordDateDisplayValue = (key: string) => {
    const value = recordAny[key];

    if (!value) {
      return "";
    }

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("vi-VN");
  };

  const metadataItems = [
    {
      label: "Mã định danh tài liệu",
      value: getFirstRecordDisplayValue("document_identifier", "document_code"),
    },
    {
      label: "Số thứ tự trong hồ sơ",
      value: getRecordDisplayValue("order_in_profile"),
    },
    {
      label: "Tên thể loại văn bản",
      value: getRecordDisplayValue("document_type"),
    },
    {
      label: "Số/ký hiệu văn bản",
      value: getRecordDisplayValue("document_code"),
    },
    {
      label: "Số văn bản",
      value: getRecordDisplayValue("document_number"),
    },
    {
      label: "Ký hiệu văn bản",
      value: getRecordDisplayValue("document_symbol"),
    },
    {
      label: "Ngày tháng năm văn bản",
      value: getRecordDateDisplayValue("document_date"),
    },
    {
      label: "Tác giả / Cơ quan ban hành",
      value: getRecordDisplayValue("author"),
    },
    {
      label: "Người ký",
      value: getRecordDisplayValue("signer"),
    },
    {
      label: "Loại bản",
      value: getRecordDisplayValue("copy_type"),
    },
    {
      label: "Số lượng trang",
      value: getRecordDisplayValue("page_count"),
    },
    {
      label: "Ngôn ngữ",
      value: getRecordDisplayValue("language"),
    },
    {
      label: "Độ mật",
      value: getRecordDisplayValue("security_level"),
    },
    {
      label: "Từ trang",
      value: getFirstRecordDisplayValue("page_number", "start_page"),
    },
    {
      label: "Đến trang",
      value: getRecordDisplayValue("end_page"),
    },
    {
      label: "Tệp/tập tin đính kèm văn bản",
      value: getRecordDisplayValue("attachment_note"),
    },
    {
      label: "Chữ ký số",
      value: getRecordDisplayValue("digital_signature"),
    },
    {
      label: "Trích yếu nội dung",
      value: getFirstRecordDisplayValue("summary", "description"),
    },
    {
      label: "Ghi chú",
      value: getFirstRecordDisplayValue("note", "notes"),
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={isViewerRecordDetailUser ? "/tim-kiem" : `/ho-so/${getProfileId(record)}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Link>
            </Button>

            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Thành phần tài liệu
            </span>

            <Badge variant={isEditMode ? "default" : "secondary"}>
              {isEditMode ? "Đang sửa" : "Chỉ xem"}
            </Badge>

            {recordFiles.length > 0 ? (
              <Badge variant="secondary">Đã upload</Badge>
            ) : null}
          </div>

          <h2 className="truncate text-lg font-semibold">
            {record.title}
          </h2>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            {record.document_code}
            {record.document_type ? ` · ${record.document_type}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              recordQuery.refetch();
              filesQuery.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tải lại
          </Button>

          {isEditMode ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/tai-lieu/${record.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Xem
                </Link>
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={!formValues || updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Đang lưu..." : "Lưu bản ghi"}
              </Button>
            </>
          ) : canEditRecordDetail ? (
            <Button asChild>
              <Link href={`/tai-lieu/${record.id}?mode=edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Sửa bản ghi
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {saveMessage ? (
        <Alert>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Hash className="h-4 w-4" />}
          label="Số / ký hiệu"
          value={record.document_code}
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Ngày văn bản"
          value={formatDate(record.document_date)}
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="File"
          value={`${recordFiles.length} file`}
        />
        <StatCard
          icon={<Shield className="h-4 w-4" />}
          label="Độ mật"
          value={record.security_level || "Thường"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/40 p-3">
              <div className="flex flex-wrap gap-2 rounded-xl bg-muted p-1">
                <TabButton
                  active={activeTab === "metadata"}
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() => setActiveTab("metadata")}
                >
                  Biên mục
                </TabButton>

                {isEditMode ? (
                  <TabButton
                    active={activeTab === "ocr"}
                    icon={<Sparkles className="h-4 w-4" />}
                    onClick={() => setActiveTab("ocr")}
                  >
                    Gợi ý OCR
                  </TabButton>
                ) : null}

              </div>
            </div>

            <CardContent className="p-4">
              {activeTab === "metadata" && !isEditMode ? (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-background p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Tiêu đề / Tên gọi văn bản
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {record.title}
                    </div>
                  </div>

                  <RecordMetadataFullGrid items={metadataItems} />
                </div>
              ) : null}

              {activeTab === "metadata" && isEditMode && formValues ? (
                <div className="space-y-5">
                  <div className="rounded-xl border bg-background p-4">
                    <div className="mb-3 text-sm font-semibold">
                      Sửa trường bản ghi
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <EditInput
                        label="Mã định danh tài liệu"
                        value={formValues.document_identifier}
                        onChange={(value) => setField("document_identifier", value)}
                      />
                      <EditInput
                        label="Số thứ tự trong hồ sơ"
                        value={formValues.order_in_profile}
                        onChange={(value) => setField("order_in_profile", value)}
                      />
                      <EditInput
                        label="Tên thể loại văn bản"
                        value={formValues.document_type}
                        onChange={(value) => setField("document_type", value)}
                      />
                      <EditInput
                        label="Số/ký hiệu văn bản"
                        value={formValues.document_code}
                        onChange={(value) => setField("document_code", value)}
                        required
                      />
                      <EditInput
                        label="Số văn bản"
                        value={formValues.document_number}
                        onChange={(value) => setField("document_number", value)}
                      />
                      <EditInput
                        label="Ký hiệu văn bản"
                        value={formValues.document_symbol}
                        onChange={(value) => setField("document_symbol", value)}
                      />
                      <EditInput
                        label="Tiêu đề/Tên gọi văn bản"
                        value={formValues.title}
                        onChange={(value) => setField("title", value)}
                        required
                        wide
                      />
                      <EditInput
                        label="Ngày/tháng/năm văn bản"
                        type="date"
                        value={formValues.document_date}
                        onChange={(value) => setField("document_date", value)}
                      />
                      <EditInput
                        label="Tác giả/Cơ quan ban hành"
                        value={formValues.author}
                        onChange={(value) => setField("author", value)}
                      />
                      <EditInput
                        label="Người ký"
                        value={formValues.signer}
                        onChange={(value) => setField("signer", value)}
                      />
                      <EditInput
                        label="Loại bản"
                        value={formValues.copy_type}
                        onChange={(value) => setField("copy_type", value)}
                      />
                      <EditInput
                        label="Số lượng trang"
                        value={formValues.page_count}
                        onChange={(value) => setField("page_count", value)}
                      />
                      <EditInput
                        label="Ngôn ngữ"
                        value={formValues.language}
                        onChange={(value) => setField("language", value)}
                      />
                      <EditInput
                        label="Độ mật"
                        value={formValues.security_level}
                        onChange={(value) => setField("security_level", value)}
                      />
                      <EditInput
                        label="Trang số"
                        value={formValues.page_number}
                        onChange={(value) => setField("page_number", value)}
                      />
                      <EditInput
                        label="Từ trang"
                        value={formValues.page_start}
                        onChange={(value) => setField("page_start", value)}
                      />
                      <EditInput
                        label="Đến trang"
                        value={formValues.page_end}
                        onChange={(value) => setField("page_end", value)}
                      />
                      <EditInput
                        label="Tệp/tập tin đính kèm văn bản"
                        value={formValues.attachment_note}
                        onChange={(value) => setField("attachment_note", value)}
                        wide
                      />
                      <EditInput
                        label="Chữ ký số"
                        value={formValues.digital_signature}
                        onChange={(value) => setField("digital_signature", value)}
                        wide
                      />
                      <EditTextarea
                        label="Trích yếu nội dung"
                        value={formValues.summary}
                        onChange={(value) => setField("summary", value)}
                        rows={4}
                      />
                      <EditTextarea
                        label="Ghi chú"
                        value={formValues.notes}
                        onChange={(value) => setField("notes", value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "ocr" && isEditMode ? (
                <div className="min-w-0 space-y-4">
                  <RecordOcrPanel
                    recordId={record.id}
                    digitalFiles={recordFiles}
                  />

                  <RecordOcrSuggestionCard
                    record={record}
                    file={ocrFile}
                    onApplied={() => {
                      recordQuery.refetch();
                      filesQuery.refetch();
                    }}
                  />
                </div>
              ) : null}

            </CardContent>
          </Card>

          {isEditMode ? (
            <details className="group rounded-2xl border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
                <Upload className="h-4 w-4" />
                Upload / thay file khác
                <span className="ml-auto text-xs text-muted-foreground group-open:hidden">
                  Mở khi cần
                </span>
              </summary>

              <div className="border-t">
                <RecordFileUploadPanel
                  profileId={getProfileId(record)}
                  documentId={record.id}
                  onUploaded={() => {
                    recordQuery.refetch();
                    filesQuery.refetch();
                  }}
                />
              </div>
            </details>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="sticky top-4">
            {filesQuery.isLoading || filesQuery.isFetching ? (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-[720px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <div className="min-w-0">
                <RecordPdfPreviewCard digitalFiles={recordFiles} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
