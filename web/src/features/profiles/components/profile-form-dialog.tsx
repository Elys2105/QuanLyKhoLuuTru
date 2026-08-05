"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type {
  Catalog,
  Fond,
  StorageBox,
  StorageFile,
  StorageLocation,
  Warehouse,
} from "@/features/master-data/types";
import type {
  Profile,
  ProfileFormValues,
  ProfilePayload,
} from "@/features/profiles/types";
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

interface ProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProfile?: Profile | null;
  fonds: Fond[];
  catalogs: Catalog[];
  warehouses?: Warehouse[];
  locations?: StorageLocation[];
  boxes?: StorageBox[];
  storageFiles: StorageFile[];
  isSaving?: boolean;
  error?: unknown;
  onSubmit: (
    payload: ProfilePayload,
    editingProfile?: Profile | null,
  ) => Promise<void>;
}

const PROFILE_TYPE_OPTIONS = [
  "Hồ sơ",
  "Hồ sơ nguyên tắc",
  "Hồ sơ công việc",
  "Hồ sơ nhân sự",
  "Hồ sơ tài chính",
  "Khác",
];

const RETENTION_OPTIONS = [
  "Vĩnh viễn",
  "70 năm",
  "50 năm",
  "30 năm",
  "20 năm",
  "10 năm",
  "5 năm",
  "Khác",
];

const PHYSICAL_CONDITION_OPTIONS = [
  "Bình thường",
  "Ố vàng",
  "Rách",
  "Mờ chữ",
  "Hư hỏng",
  "Cần tu bổ",
  "Khác",
];

const DEFAULT_VALUES: ProfileFormValues = {
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

function getField(item: unknown, names: string[]): unknown {
  const record = item as Record<string, unknown>;

  for (const name of names) {
    const value = record?.[name];

    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return "";
}

function getId(item: unknown): string {
  return toText(getField(item, ["id"]));
}

function getRelationId(item: unknown, names: string[]): string {
  return toText(getField(item, names));
}

function makeLabel(item: unknown, names: string[], fallback: string): string {
  const record = item as Record<string, unknown>;

  const parts = names
    .map((name) => toText(record?.[name]).trim())
    .filter(Boolean);

  return parts.length ? parts.join(" - ") : fallback;
}

function filterByRelation<T>(
  items: T[],
  selectedId: string,
  relationKeys: string[],
): T[] {
  if (!selectedId) return items;

  const matched = items.filter(
    (item) => getRelationId(item, relationKeys) === selectedId,
  );

  return matched.length ? matched : items;
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

function getOptions(baseOptions: string[], currentValue: string): string[] {
  const value = currentValue.trim();

  if (!value || baseOptions.includes(value)) {
    return baseOptions;
  }

  return [value, ...baseOptions];
}

function toFormValues(profile?: Profile | null): ProfileFormValues {
  if (!profile) return DEFAULT_VALUES;

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

function buildPayload(values: ProfileFormValues): ProfilePayload {
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

function validateForm(values: ProfileFormValues): string | null {
  if (!values.profile_type.trim()) return "Vui lòng chọn loại hồ sơ.";
  if (!values.fond) return "Vui lòng chọn phông.";
  if (!values.catalog) return "Vui lòng chọn mục lục.";
  if (!values.profile_code.trim()) return "Vui lòng nhập mã hồ sơ.";
  if (!values.title.trim()) return "Vui lòng nhập tiêu đề hồ sơ.";
  if (!values.retention_period.trim()) return "Vui lòng chọn thời hạn bảo quản.";

  if (!values.warehouse) return "Vui lòng chọn kho.";
  if (!values.location) return "Vui lòng chọn kệ / vị trí.";
  if (!values.box) return "Vui lòng chọn hộp / cặp.";
  if (!values.storage_file) return "Vui lòng chọn tệp lưu trữ.";

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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b bg-muted/25 px-4 py-3">
        <div className="text-sm font-semibold">{title}</div>

        {description ? (
          <div className="mt-1 text-xs text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>

      <div className="grid gap-x-5 gap-y-4 p-4 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
  wide,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
      <Label className="text-[13px] font-medium">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>

      {children}
    </div>
  );
}

export function ProfileFormDialog({
  open,
  onOpenChange,
  editingProfile,
  fonds,
  catalogs,
  warehouses = [],
  locations = [],
  boxes = [],
  storageFiles,
  isSaving,
  error,
  onSubmit,
}: ProfileFormDialogProps) {
  const [values, setValues] = useState<ProfileFormValues>(DEFAULT_VALUES);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setValues(toFormValues(editingProfile));
    setFormError(null);
  }, [open, editingProfile]);

  const filteredCatalogs = useMemo(() => {
    return filterByRelation(catalogs, values.fond, ["fond_id", "fond"]);
  }, [catalogs, values.fond]);

  const filteredLocations = useMemo(() => {
    return filterByRelation(locations, values.warehouse, [
      "warehouse_id",
      "warehouse",
    ]);
  }, [locations, values.warehouse]);

  const filteredBoxes = useMemo(() => {
    return filterByRelation(boxes, values.location, [
      "location_id",
      "location",
    ]);
  }, [boxes, values.location]);

  const filteredStorageFiles = useMemo(() => {
    return filterByRelation(storageFiles, values.box, [
      "box_id",
      "box",
    ]);
  }, [storageFiles, values.box]);

  function setValue<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  function handleFondChange(value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      fond: value,
      catalog: "",
    }));
  }

  function handleCatalogChange(value: string) {
    const catalog = catalogs.find((item) => getId(item) === value);
    const fondId = getRelationId(catalog, ["fond_id", "fond"]);

    setValues((currentValues) => ({
      ...currentValues,
      catalog: value,
      fond: fondId || currentValues.fond,
    }));
  }

  function handleWarehouseChange(value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      warehouse: value,
      location: "",
      box: "",
      storage_file: "",
    }));
  }

  function handleLocationChange(value: string) {
    const location = locations.find((item) => getId(item) === value);
    const warehouseId = getRelationId(location, ["warehouse_id", "warehouse"]);

    setValues((currentValues) => ({
      ...currentValues,
      warehouse: warehouseId || currentValues.warehouse,
      location: value,
      box: "",
      storage_file: "",
    }));
  }

  function handleBoxChange(value: string) {
    const box = boxes.find((item) => getId(item) === value);
    const locationId = getRelationId(box, ["location_id", "location"]);
    const location = locations.find((item) => getId(item) === locationId);
    const warehouseId = getRelationId(location, ["warehouse_id", "warehouse"]);

    setValues((currentValues) => ({
      ...currentValues,
      warehouse: warehouseId || currentValues.warehouse,
      location: locationId || currentValues.location,
      box: value,
      storage_file: "",
    }));
  }

  function handleStorageFileChange(value: string) {
    const storageFile = storageFiles.find((item) => getId(item) === value);
    const boxId = getRelationId(storageFile, ["box_id", "box"]);
    const box = boxes.find((item) => getId(item) === boxId);
    const locationId = getRelationId(box, ["location_id", "location"]);
    const location = locations.find((item) => getId(item) === locationId);
    const warehouseId = getRelationId(location, ["warehouse_id", "warehouse"]);

    setValues((currentValues) => ({
      ...currentValues,
      warehouse: warehouseId || currentValues.warehouse,
      location: locationId || currentValues.location,
      box: boxId || currentValues.box,
      storage_file: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm(values);
    if (validationError) {
      setFormError(validationError);
      window.alert(validationError);
      return;
    }

    setFormError(null);
    await onSubmit(buildPayload(values), editingProfile);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {editingProfile ? "Sửa hồ sơ" : "Thêm mới hồ sơ"}
          </DialogTitle>

          <p className="text-sm text-muted-foreground">
            Nhập thông tin biên mục hồ sơ theo từng nhóm để dễ kiểm tra.
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
                  {getApiErrorMessage(error, "Không lưu được hồ sơ.")}
                </AlertDescription>
              </Alert>
            ) : null}

            <Section
              title="Phân loại"
              description="Thông tin định danh chính của hồ sơ."
            >
              <Field label="Loại hồ sơ" required>
                <Select
                  value={values.profile_type}
                  onValueChange={(value) => setValue("profile_type", value)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn loại hồ sơ" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptions(PROFILE_TYPE_OPTIONS, values.profile_type).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Mã hồ sơ" required>
                <Input
                  className="h-9"
                  value={values.profile_code}
                  onChange={(event) => setValue("profile_code", event.target.value)}
                  disabled={isSaving}
                />
              </Field>

              <Field label="Phông" required>
                <Select
                  value={values.fond}
                  onValueChange={handleFondChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn phông" />
                  </SelectTrigger>
                  <SelectContent>
                    {fonds.map((fond, index) => {
                      const id = getId(fond);

                      if (!id) return null;

                      return (
                        <SelectItem key={id || index} value={id}>
                          {makeLabel(fond, ["code", "name", "title"], `Phông ${id}`)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Mục lục số" required>
                <Select
                  value={values.catalog}
                  onValueChange={handleCatalogChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn mục lục" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCatalogs.map((catalog, index) => {
                      const id = getId(catalog);

                      if (!id) return null;

                      return (
                        <SelectItem key={id || index} value={id}>
                          {makeLabel(catalog, ["code", "name", "title"], `Mục lục ${id}`)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Đơn vị bảo quản số">
                <Input
                  className="h-9"
                  value={values.preservation_unit_number}
                  onChange={(event) =>
                    setValue("preservation_unit_number", event.target.value)
                  }
                  disabled={isSaving}
                />
              </Field>

              <Field label="Số và ký hiệu hồ sơ">
                <Input
                  className="h-9"
                  value={values.file_notation}
                  onChange={(event) => setValue("file_notation", event.target.value)}
                  disabled={isSaving}
                />
              </Field>

              <Field label="Tiêu đề hồ sơ" required wide>
                <Input
                  className="h-9"
                  value={values.title}
                  onChange={(event) => setValue("title", event.target.value)}
                  disabled={isSaving}
                />
              </Field>
            </Section>

            <Section
              title="Thời gian và bảo quản"
              description="Mốc thời gian, thời hạn bảo quản và tình trạng vật lý."
            >
              <Field label="Thời gian bắt đầu">
                <Input
                  className="h-9"
                  type="date"
                  value={values.start_date}
                  onChange={(event) => setValue("start_date", event.target.value)}
                  disabled={isSaving}
                />
              </Field>

              <Field label="Thời gian kết thúc">
                <Input
                  className="h-9"
                  type="date"
                  value={values.end_date}
                  onChange={(event) => setValue("end_date", event.target.value)}
                  disabled={isSaving}
                />
              </Field>

              <Field label="Mã cơ quan lưu trữ lịch sử">
                <Input
                  className="h-9"
                  value={values.historical_archive_code}
                  onChange={(event) =>
                    setValue("historical_archive_code", event.target.value)
                  }
                  disabled={isSaving}
                />
              </Field>

              <Field label="Thời hạn bảo quản" required>
                <Select
                  value={values.retention_period}
                  onValueChange={(value) => setValue("retention_period", value)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn thời hạn" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptions(RETENTION_OPTIONS, values.retention_period).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Section
              title="Số liệu và phân nhóm"
              description="Các thông tin thống kê nhanh của hồ sơ."
            >
              <Field label="Tổng số tài liệu">
                <Input
                  className="h-9"
                  inputMode="numeric"
                  value={values.total_documents}
                  onChange={(event) => setValue("total_documents", event.target.value)}
                  disabled={isSaving}
                />
              </Field>

              <Field label="Tổng số trang">
                <Input
                  className="h-9"
                  inputMode="numeric"
                  value={values.total_pages}
                  onChange={(event) => setValue("total_pages", event.target.value)}
                  disabled={isSaving}
                />
              </Field>

              <Field label="Tên nhóm hồ sơ">
                <Input
                  className="h-9"
                  value={values.profile_group_name}
                  onChange={(event) =>
                    setValue("profile_group_name", event.target.value)
                  }
                  disabled={isSaving}
                />
              </Field>

              <Field label="Tình trạng vật lý">
                <Select
                  value={values.physical_condition}
                  onValueChange={(value) => setValue("physical_condition", value)}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn tình trạng" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptions(PHYSICAL_CONDITION_OPTIONS, values.physical_condition).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Từ khóa">
                <Input
                  className="h-9"
                  value={values.keywords}
                  onChange={(event) => setValue("keywords", event.target.value)}
                  disabled={isSaving}
                />
              </Field>

              <Field label="Chuyên đề">
                <Input
                  className="h-9"
                  value={values.topic}
                  onChange={(event) => setValue("topic", event.target.value)}
                  disabled={isSaving}
                />
              </Field>
            </Section>

            <Section
              title="Vị trí lưu trữ"
              description="Chọn lần lượt: Kho → Kệ / Vị trí → Hộp / Cặp → Tệp."
            >
              <Field label="Kho" required>
                <Select
                  value={values.warehouse}
                  onValueChange={handleWarehouseChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn kho" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse, index) => {
                      const id = getId(warehouse);

                      if (!id) return null;

                      return (
                        <SelectItem key={id || index} value={id}>
                          {makeLabel(warehouse, ["code", "name"], `Kho ${id}`)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Kệ / Vị trí" required>
                <Select
                  value={values.location}
                  onValueChange={handleLocationChange}
                  disabled={isSaving || !values.warehouse}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn kệ / vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((location, index) => {
                      const id = getId(location);

                      if (!id) return null;

                      return (
                        <SelectItem key={id || index} value={id}>
                          {makeLabel(location, ["code", "name"], `Vị trí ${id}`)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Hộp / Cặp" required>
                <Select
                  value={values.box}
                  onValueChange={handleBoxChange}
                  disabled={isSaving || !values.location}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn hộp / cặp" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBoxes.map((box, index) => {
                      const id = getId(box);
                      const boxNumber = toText(getField(box, ["box_number", "code", "number"]));
                      const boxTitle = toText(getField(box, ["title", "name"]));

                      if (!id) return null;

                      return (
                        <SelectItem key={id || index} value={id}>
                          {[boxNumber ? `Hộp ${boxNumber}` : `Hộp ${id}`, boxTitle]
                            .filter(Boolean)
                            .join(" - ")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tệp lưu trữ" required>
                <Select
                  value={values.storage_file}
                  onValueChange={handleStorageFileChange}
                  disabled={isSaving || !values.box}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn tệp" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStorageFiles.map((file, index) => {
                      const id = getId(file);
                      const fileNumber = toText(getField(file, ["file_number", "code", "number"]));
                      const fileTitle = toText(getField(file, ["title", "name"]));

                      if (!id) return null;

                      return (
                        <SelectItem key={id || index} value={id}>
                          {[fileNumber ? `Tệp ${fileNumber}` : `Tệp ${id}`, fileTitle]
                            .filter(Boolean)
                            .join(" - ")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Cấp số hoặc kho, giá, cặp số" wide>
                <Input
                  className="h-9"
                  value={values.storage_position_text}
                  onChange={(event) =>
                    setValue("storage_position_text", event.target.value)
                  }
                  disabled={isSaving}
                />
              </Field>
            </Section>

            <Section title="Ghi chú" description="Thông tin bổ sung khi cần.">
              <Field label="Chú thích" wide>
                <Textarea
                  value={values.notes}
                  onChange={(event) => setValue("notes", event.target.value)}
                  disabled={isSaving}
                  rows={3}
                />
              </Field>

              <Field label="Mô tả nội dung hồ sơ" wide>
                <Textarea
                  value={values.description}
                  onChange={(event) => setValue("description", event.target.value)}
                  disabled={isSaving}
                  rows={3}
                />
              </Field>
            </Section>
          </div>


          {formError ? (
            <div
              data-profile-save-error-bottom
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </div>
          ) : null}

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
              {isSaving ? "Đang lưu..." : "Lưu hồ sơ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}