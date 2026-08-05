import type {
  Document,
  DocumentFormValues,
  DocumentPayload,
} from "@/features/documents/types";

export const DEFAULT_DOCUMENT_FORM_VALUES: DocumentFormValues = {
  profile: "",

  document_identifier: "",
  order_in_profile: "",

  document_code: "",
  document_number: "",
  document_symbol: "",
  document_type: "",

  title: "",
  summary: "",
  document_date: "",

  author: "",
  signer: "",

  copy_type: "",
  language: "Tiếng Việt",
  security_level: "",

  page_start: "",
  page_end: "",
  page_count: "",
  page_number: "",

  attachment_note: "",
  digital_signature: "",

  notes: "",
};

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function createDocumentFormValuesFromDocument(
  document: Document,
): DocumentFormValues {
  return {
    profile: toText(document.profile_id || document.profile),

    document_identifier: document.document_identifier || "",
    order_in_profile: toText(document.order_in_profile),

    document_code: document.document_code || "",
    document_number: document.document_number || "",
    document_symbol: document.document_symbol || "",
    document_type: document.document_type || "",

    title: document.title || "",
    summary: document.summary || "",
    document_date: document.document_date || "",

    author: document.author || "",
    signer: document.signer || "",

    copy_type: document.copy_type || "",
    language: document.language || "Tiếng Việt",
    security_level: document.security_level || "",

    page_start: toText(document.page_start ?? document.start_page),
    page_end: toText(document.page_end ?? document.end_page),
    page_count: toText(document.page_count),
    page_number: document.page_number || "",

    attachment_note: document.attachment_note || "",
    digital_signature: document.digital_signature || "",

    notes: document.notes || document.note || "",
  };
}

export function buildDocumentPayload(
  values: DocumentFormValues,
  fixedProfileId?: string | number | null,
): DocumentPayload {
  return {
    profile: fixedProfileId || values.profile,

    document_identifier: emptyToUndefined(values.document_identifier),
    order_in_profile: toNumberOrNull(values.order_in_profile),

    document_code: values.document_code.trim(),
    document_number: emptyToUndefined(values.document_number),
    document_symbol: emptyToUndefined(values.document_symbol),
    document_type: emptyToUndefined(values.document_type),

    title: values.title.trim(),
    summary: emptyToUndefined(values.summary),
    document_date: values.document_date || null,

    author: emptyToUndefined(values.author),
    signer: emptyToUndefined(values.signer),

    copy_type: emptyToUndefined(values.copy_type),
    language: values.language.trim() || "Tiếng Việt",
    security_level: emptyToUndefined(values.security_level),

    page_start: toNumberOrNull(values.page_start),
    page_end: toNumberOrNull(values.page_end),
    page_count: toNumberOrNull(values.page_count),
    page_number: emptyToUndefined(values.page_number),

    attachment_note: emptyToUndefined(values.attachment_note),
    digital_signature: emptyToUndefined(values.digital_signature),

    notes: emptyToUndefined(values.notes),
  };
}

export function validateDocumentForm(
  values: DocumentFormValues,
  fixedProfileId?: string | number | null,
): string | null {
  if (!fixedProfileId && !values.profile) {
    return "Vui lòng chọn hồ sơ.";
  }

  if (!values.document_code.trim()) {
    return "Vui lòng nhập số/ký hiệu văn bản.";
  }

  if (!values.title.trim()) {
    return "Vui lòng nhập tiêu đề/trích yếu bản ghi.";
  }

  const numericFields = [
    ["Số thứ tự văn bản trong hồ sơ", values.order_in_profile],
    ["Trang bắt đầu", values.page_start],
    ["Trang kết thúc", values.page_end],
    ["Số lượng trang", values.page_count],
  ] as const;

  for (const [label, value] of numericFields) {
    if (value && Number.isNaN(Number(value))) {
      return `${label} phải là số.`;
    }
  }

  const startPage = values.page_start ? Number(values.page_start) : null;
  const endPage = values.page_end ? Number(values.page_end) : null;

  if (startPage && endPage && startPage > endPage) {
    return "Trang bắt đầu không được lớn hơn trang kết thúc.";
  }

  return null;
}