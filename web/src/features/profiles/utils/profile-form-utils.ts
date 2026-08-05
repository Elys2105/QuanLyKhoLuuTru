import type {
  Profile,
  ProfileFormValues,
  ProfilePayload,
} from "@/features/profiles/types";

export const DEFAULT_PROFILE_FORM_VALUES: ProfileFormValues = {
  fond: "",
  catalog: "",

  warehouse: "",
  location: "",
  box: "",
  storage_file: "",

  profile_type: "Hồ sơ",
  preservation_unit_number: "",
  profile_code: "",
  file_notation: "",
  title: "",

  start_date: "",
  end_date: "",
  year: "",

  historical_archive_code: "",
  total_documents: "",
  total_pages: "",
  profile_group_name: "",
  retention_period: "",
  physical_condition: "",
  keywords: "",
  topic: "",
  storage_position_text: "",

  language: "Tiếng Việt",
  description: "",
  notes: "",
  search_text: "",
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

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export function createProfileFormValuesFromProfile(
  profile: Profile,
): ProfileFormValues {
  return {
    fond: toText(profile.fond_id || profile.fond),
    catalog: toText(profile.catalog_id || profile.catalog),

    warehouse: toText(profile.warehouse_id || profile.warehouse),
    location: toText(profile.location_id || profile.location),
    box: toText(profile.box_id || profile.box),
    storage_file: toText(profile.storage_file_id || profile.storage_file),

    profile_type: profile.profile_type || "Hồ sơ",
    preservation_unit_number: profile.preservation_unit_number || "",
    profile_code: profile.profile_code || "",
    file_notation: profile.file_notation || "",
    title: profile.title || "",

    start_date: profile.start_date || "",
    end_date: profile.end_date || "",
    year: toText(profile.year),

    historical_archive_code: profile.historical_archive_code || "",
    total_documents: toText(profile.total_documents),
    total_pages: toText(profile.total_pages),
    profile_group_name: profile.profile_group_name || "",
    retention_period: profile.retention_period || "",
    physical_condition: profile.physical_condition || "",
    keywords: profile.keywords || "",
    topic: profile.topic || "",
    storage_position_text: profile.storage_position_text || "",

    language: profile.language || "Tiếng Việt",
    description: profile.description || "",
    notes: profile.notes || profile.note || "",
    search_text: profile.search_text || "",
  };
}

export function buildProfilePayload(
  values: ProfileFormValues,
): ProfilePayload {
  return {
    catalog: values.catalog,
    storage_file: values.storage_file || null,

    profile_type: values.profile_type || "Hồ sơ",
    preservation_unit_number: emptyToUndefined(values.preservation_unit_number),
    profile_code: values.profile_code.trim(),
    file_notation: emptyToUndefined(values.file_notation),
    title: values.title.trim(),

    start_date: values.start_date || null,
    end_date: values.end_date || null,
    year: toNumberOrNull(values.year),

    historical_archive_code: emptyToUndefined(values.historical_archive_code),
    total_documents: toNumberOrNull(values.total_documents),
    total_pages: toNumberOrNull(values.total_pages),
    profile_group_name: emptyToUndefined(values.profile_group_name),
    retention_period: emptyToNull(values.retention_period),
    physical_condition: emptyToUndefined(values.physical_condition),
    keywords: emptyToUndefined(values.keywords),
    topic: emptyToUndefined(values.topic),
    storage_position_text: emptyToUndefined(values.storage_position_text),

    language: values.language.trim() || "Tiếng Việt",
    description: emptyToUndefined(values.description),
    notes: emptyToUndefined(values.notes),
  };
}

export function validateProfileForm(values: ProfileFormValues): string | null {
  if (!values.profile_type.trim()) return "Vui lòng chọn loại hồ sơ.";
  if (!values.fond) return "Vui lòng chọn phông.";
  if (!values.catalog) return "Vui lòng chọn mục lục.";
  if (!values.profile_code.trim()) return "Vui lòng nhập mã hồ sơ.";
  if (!values.title.trim()) return "Vui lòng nhập tiêu đề hồ sơ.";
  if (!values.retention_period.trim()) {
    return "Vui lòng nhập hoặc chọn thời hạn bảo quản.";
  }

  if (values.year && Number.isNaN(Number(values.year))) {
    return "Năm phải là số.";
  }

  if (values.total_documents && Number.isNaN(Number(values.total_documents))) {
    return "Tổng số tài liệu phải là số.";
  }

  if (values.total_pages && Number.isNaN(Number(values.total_pages))) {
    return "Tổng số trang phải là số.";
  }

  if (values.start_date && values.end_date && values.start_date > values.end_date) {
    return "Thời gian bắt đầu không được lớn hơn thời gian kết thúc.";
  }

  return null;
}