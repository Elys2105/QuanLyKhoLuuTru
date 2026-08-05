import type { BaseEntity, ID } from "@/types/common";
import type { ListQueryParams } from "@/types/pagination";

export interface Fond extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  start_year?: number | null;
  end_year?: number | null;
}

export interface Catalog extends BaseEntity {
  fond: ID;
  fond_id?: ID;
  fond_code?: string;
  fond_name?: string;
  code: string;
  name: string;
  description?: string;
}

export interface Warehouse extends BaseEntity {
  code: string;
  name: string;
  address?: string;
  description?: string;
}

export interface StorageLocation extends BaseEntity {
  warehouse: ID;
  warehouse_id?: ID;
  warehouse_code?: string;
  warehouse_name?: string;
  code: string;
  name: string;
  description?: string;
}

export interface StorageBox extends BaseEntity {
  location: ID;
  location_id?: ID;
  location_code?: string;
  location_name?: string;

  fond?: ID;
  fond_id?: ID;
  fond_code?: string;
  fond_name?: string;

  catalog?: ID;
  catalog_id?: ID;
  catalog_code?: string;
  catalog_name?: string;

  box_number: string;
  title?: string;
  description?: string;
}

export interface StorageFile extends BaseEntity {
  box: ID;
  box_id?: ID;
  box_number?: string;
  file_number: string;
  title?: string;
  description?: string;
}

export interface FondPayload {
  code: string;
  name: string;
  description?: string;
  start_year?: number | null;
  end_year?: number | null;
}

export interface CatalogPayload {
  fond: ID | string;
  code: string;
  name: string;
  description?: string;
}

export interface WarehousePayload {
  code: string;
  name: string;
  address?: string;
  description?: string;
}

export interface StorageLocationPayload {
  warehouse: ID | string;
  code: string;
  name: string;
  description?: string;
}

export interface StorageBoxPayload {
  location: ID | string;
  fond?: ID | string;
  catalog?: ID | string;
  box_number: string;
  title?: string;
  description?: string;
}

export interface StorageFilePayload {
  box: ID | string;
  file_number: string;
  title?: string;
  description?: string;
}

export interface MasterDataQueryParams extends ListQueryParams {
  fond?: ID | string;
  warehouse?: ID | string;
  location?: ID | string;
  box?: ID | string;
}

export interface MasterDataOption {
  label: string;
  value: string;
}

export type MasterDataFormValue = string;

export type MasterDataFormValues = Record<string, MasterDataFormValue>;

export type MasterDataFieldType =
  | "text"
  | "number"
  | "textarea"
  | "select";

export interface MasterDataField {
  name: string;
  label: string;
  type: MasterDataFieldType;
  required?: boolean;
  placeholder?: string;
  options?: MasterDataOption[];
}

export interface MasterDataColumn<TItem> {
  key: keyof TItem | string;
  label: string;
  render?: (item: TItem) => string;
}

export interface MasterDataRecord {
  id: ID;
  [key: string]: unknown;
}