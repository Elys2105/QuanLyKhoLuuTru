"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";

import { useMasterDataCrud } from "@/features/master-data/hooks/use-master-data-crud";
import type {
  MasterDataColumn,
  MasterDataField,
  MasterDataFormValues,
} from "@/features/master-data/types";
import { getApiErrorMessage } from "@/lib/api/client";
import { fallbackText } from "@/lib/utils/format";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type MasterDataItemBase = {
  id: string | number;
};

interface MasterDataManagerProps<TItem extends MasterDataItemBase, TPayload> {
  title: string;
  description: string;
  queryKey: string[];
  fields: MasterDataField[];
  columns: MasterDataColumn<TItem>[];
  listFn: () => Promise<TItem[]>;
  createFn: (payload: TPayload) => Promise<TItem>;
  updateFn: (id: string | number, payload: Partial<TPayload>) => Promise<TItem>;
  deleteFn: (id: string | number) => Promise<void>;
  getItemTitle: (item: TItem) => string;
  buildPayload?: (values: MasterDataFormValues) => TPayload;
}

function createInitialValues(fields: MasterDataField[]): MasterDataFormValues {
  const values: MasterDataFormValues = {};

  fields.forEach((field) => {
    values[field.name] = "";
  });

  return values;
}

function getItemFieldValue<TItem extends MasterDataItemBase>(
  item: TItem,
  fieldName: string,
): unknown {
  return (item as Record<string, unknown>)[fieldName];
}

function createValuesFromItem<TItem extends MasterDataItemBase>(
  fields: MasterDataField[],
  item: TItem,
): MasterDataFormValues {
  const values = createInitialValues(fields);

  fields.forEach((field) => {
    const rawValue = getItemFieldValue(item, field.name);

    if (rawValue === null || rawValue === undefined) {
      values[field.name] = "";
      return;
    }

    values[field.name] = String(rawValue);
  });

  return values;
}

function defaultBuildPayload<TPayload>(
  values: MasterDataFormValues,
): TPayload {
  const payload: Record<string, string | number> = {};

  Object.entries(values).forEach(([key, value]) => {
    if (value === "") return;

    const numericValue = Number(value);

    if (!Number.isNaN(numericValue) && /^\d+$/.test(value)) {
      payload[key] = numericValue;
      return;
    }

    payload[key] = value;
  });

  return payload as TPayload;
}

function renderField(
  field: MasterDataField,
  values: MasterDataFormValues,
  onChange: (name: string, value: string) => void,
  disabled: boolean,
) {
  const value = values[field.name] ?? "";

  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.name}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(field.name, event.target.value)}
        disabled={disabled}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(field.name, nextValue)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder || `Chọn ${field.label}`} />
        </SelectTrigger>

        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      id={field.name}
      type={field.type === "number" ? "number" : "text"}
      value={value}
      placeholder={field.placeholder}
      onChange={(event) => onChange(field.name, event.target.value)}
      disabled={disabled}
    />
  );
}

export function MasterDataManager<
  TItem extends MasterDataItemBase,
  TPayload,
>({
  title,
  description,
  queryKey,
  fields,
  columns,
  listFn,
  createFn,
  updateFn,
  deleteFn,
  getItemTitle,
  buildPayload,
}: MasterDataManagerProps<TItem, TPayload>) {
  const {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useMasterDataCrud<TItem, TPayload>({
    queryKey,
    listFn,
    createFn,
    updateFn,
    deleteFn,
  });

  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [formValues, setFormValues] = useState<MasterDataFormValues>(() =>
    createInitialValues(fields),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const items = listQuery.data ?? [];

  const dialogTitle = editingItem
    ? `Sửa ${title.toLowerCase()}`
    : `Thêm ${title.toLowerCase()}`;

  const canSubmit = useMemo(() => {
    return fields.every((field) => {
      if (!field.required) return true;
      return Boolean(formValues[field.name]);
    });
  }, [fields, formValues]);

  useEffect(() => {
    setFormValues((currentValues) => {
      const nextValues = { ...currentValues };

      fields.forEach((field) => {
        if (!(field.name in nextValues)) {
          nextValues[field.name] = "";
        }
      });

      return nextValues;
    });
  }, [fields]);

  function handleOpenCreate() {
    setEditingItem(null);
    setFormValues(createInitialValues(fields));
    setFormError(null);
    setOpen(true);
  }

  function handleOpenEdit(item: TItem) {
    setEditingItem(item);
    setFormValues(createValuesFromItem(fields, item));
    setFormError(null);
    setOpen(true);
  }

  function updateValue(name: string, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!canSubmit) {
      setFormError("Vui lòng nhập đủ các trường bắt buộc.");
      return;
    }

    const payload = buildPayload
      ? buildPayload(formValues)
      : defaultBuildPayload<TPayload>(formValues);

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          payload: payload as Partial<TPayload>,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setOpen(false);
      setEditingItem(null);
      setFormValues(createInitialValues(fields));
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "Không lưu được dữ liệu. Vui lòng kiểm tra lại.",
        ),
      );
    }
  }

  async function handleDelete(item: TItem) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${getItemTitle(item)}" không?`,
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(item.id);
    } catch {
      // Lỗi được hiển thị qua deleteMutation.isError ở phía trên.
    }
  }

  function renderCellValue(item: TItem, column: MasterDataColumn<TItem>) {
    if (column.render) {
      return column.render(item);
    }

    const rawValue = getItemFieldValue(item, String(column.key));

    return fallbackText(rawValue as string | number | null);
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
            >
              <RefreshCw className={listQuery.isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Tải lại
            </Button>

            <Button type="button" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm mới
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {listQuery.isError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {getApiErrorMessage(
                listQuery.error,
                "Không tải được dữ liệu.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {deleteMutation.isError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {getApiErrorMessage(
                deleteMutation.error,
                "Không xóa được dữ liệu.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {listQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có dữ liệu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className="px-3 py-2 text-left font-medium"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="w-40 px-3 py-2 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-3 py-2">
                        {renderCellValue(item, column)}
                      </td>
                    ))}

                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit className="mr-1 h-3.5 w-3.5" />
                          Sửa
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3">
          <Badge variant="secondary">
            Tổng: {items.length}
          </Badge>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {formError}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={field.type === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"}
                >
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required ? (
                      <span className="ml-1 text-destructive">*</span>
                    ) : null}
                  </Label>

                  {renderField(
                    field,
                    formValues,
                    updateValue,
                    isSaving,
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>

              <Button type="submit" disabled={!canSubmit || isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}