export type ID = number;

export type Nullable<T> = T | null;

export interface TimestampFields {
  created_at?: string;
  updated_at?: string;
}

export interface SoftDeleteFields {
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface BaseEntity extends TimestampFields, SoftDeleteFields {
  id: ID;
}

export interface NamedEntity extends BaseEntity {
  name: string;
  code?: string;
  description?: string;
}

export interface SelectOption<TValue extends string | number = string | number> {
  label: string;
  value: TValue;
  description?: string;
}

export interface FormModeState {
  mode: "create" | "edit" | "view";
  id?: ID | null;
}

export interface DateRangeFilter {
  date_from?: string;
  date_to?: string;
}

export interface YearFilter {
  year?: number | string;
}

export interface HasPdfFilter {
  has_pdf?: boolean | string;
}