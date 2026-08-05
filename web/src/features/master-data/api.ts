import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient, cleanQueryParams } from "@/lib/api/client";
import {
  normalizeListResponse,
  type MaybeWrappedListResponse,
  unwrapDetailResponse,
} from "@/lib/api/normalize";
import type { ApiQueryParams, ApiResponse } from "@/types/api";
import type {
  Catalog,
  CatalogPayload,
  Fond,
  FondPayload,
  MasterDataQueryParams,
  StorageBox,
  StorageBoxPayload,
  StorageFile,
  StorageFilePayload,
  StorageLocation,
  StorageLocationPayload,
  Warehouse,
  WarehousePayload,
} from "@/features/master-data/types";

function toApiQueryParams(params?: MasterDataQueryParams): ApiQueryParams {
  return {
    q: params?.q,
    search: params?.search,
    ordering: params?.ordering,
    page: params?.page,
    page_size: params?.page_size,
    fond: params?.fond,
    warehouse: params?.warehouse,
    location: params?.location,
    box: params?.box,
  };
}

async function getList<TItem>(
  url: string,
  params?: MasterDataQueryParams,
): Promise<TItem[]> {
  const response = await apiClient.get<MaybeWrappedListResponse<TItem>>(
    url,
    {
      params: cleanQueryParams(toApiQueryParams(params)),
    },
  );

  return normalizeListResponse<TItem>(response.data).results;
}

async function createItem<TItem, TPayload>(
  url: string,
  payload: TPayload,
): Promise<TItem> {
  const response = await apiClient.post<TItem | ApiResponse<TItem>>(
    url,
    payload,
  );

  return unwrapDetailResponse<TItem>(response.data);
}

async function updateItem<TItem, TPayload>(
  url: string,
  payload: Partial<TPayload>,
): Promise<TItem> {
  const response = await apiClient.patch<TItem | ApiResponse<TItem>>(
    url,
    payload,
  );

  return unwrapDetailResponse<TItem>(response.data);
}

async function deleteItem(url: string): Promise<void> {
  await apiClient.delete(url);
}

export function getFondsApi(params?: MasterDataQueryParams): Promise<Fond[]> {
  return getList<Fond>(API_ENDPOINTS.fonds.list, params);
}

export function createFondApi(payload: FondPayload): Promise<Fond> {
  return createItem<Fond, FondPayload>(API_ENDPOINTS.fonds.list, payload);
}

export function updateFondApi(
  id: string | number,
  payload: Partial<FondPayload>,
): Promise<Fond> {
  return updateItem<Fond, FondPayload>(
    API_ENDPOINTS.fonds.detail(id),
    payload,
  );
}

export function deleteFondApi(id: string | number): Promise<void> {
  return deleteItem(API_ENDPOINTS.fonds.detail(id));
}

export function getCatalogsApi(
  params?: MasterDataQueryParams,
): Promise<Catalog[]> {
  return getList<Catalog>(API_ENDPOINTS.catalogs.list, params);
}

export function createCatalogApi(payload: CatalogPayload): Promise<Catalog> {
  return createItem<Catalog, CatalogPayload>(
    API_ENDPOINTS.catalogs.list,
    payload,
  );
}

export function updateCatalogApi(
  id: string | number,
  payload: Partial<CatalogPayload>,
): Promise<Catalog> {
  return updateItem<Catalog, CatalogPayload>(
    API_ENDPOINTS.catalogs.detail(id),
    payload,
  );
}

export function deleteCatalogApi(id: string | number): Promise<void> {
  return deleteItem(API_ENDPOINTS.catalogs.detail(id));
}

export function getWarehousesApi(
  params?: MasterDataQueryParams,
): Promise<Warehouse[]> {
  return getList<Warehouse>(API_ENDPOINTS.warehouses.list, params);
}

export function createWarehouseApi(
  payload: WarehousePayload,
): Promise<Warehouse> {
  return createItem<Warehouse, WarehousePayload>(
    API_ENDPOINTS.warehouses.list,
    payload,
  );
}

export function updateWarehouseApi(
  id: string | number,
  payload: Partial<WarehousePayload>,
): Promise<Warehouse> {
  return updateItem<Warehouse, WarehousePayload>(
    API_ENDPOINTS.warehouses.detail(id),
    payload,
  );
}

export function deleteWarehouseApi(id: string | number): Promise<void> {
  return deleteItem(API_ENDPOINTS.warehouses.detail(id));
}

export function getStorageLocationsApi(
  params?: MasterDataQueryParams,
): Promise<StorageLocation[]> {
  return getList<StorageLocation>(
    API_ENDPOINTS.storageLocations.list,
    params,
  );
}

export function createStorageLocationApi(
  payload: StorageLocationPayload,
): Promise<StorageLocation> {
  return createItem<StorageLocation, StorageLocationPayload>(
    API_ENDPOINTS.storageLocations.list,
    payload,
  );
}

export function updateStorageLocationApi(
  id: string | number,
  payload: Partial<StorageLocationPayload>,
): Promise<StorageLocation> {
  return updateItem<StorageLocation, StorageLocationPayload>(
    API_ENDPOINTS.storageLocations.detail(id),
    payload,
  );
}

export function deleteStorageLocationApi(id: string | number): Promise<void> {
  return deleteItem(API_ENDPOINTS.storageLocations.detail(id));
}

export function getStorageBoxesApi(
  params?: MasterDataQueryParams,
): Promise<StorageBox[]> {
  return getList<StorageBox>(
    API_ENDPOINTS.storageBoxes.list,
    params,
  );
}

export function createStorageBoxApi(
  payload: StorageBoxPayload,
): Promise<StorageBox> {
  return createItem<StorageBox, StorageBoxPayload>(
    API_ENDPOINTS.storageBoxes.list,
    payload,
  );
}

export function updateStorageBoxApi(
  id: string | number,
  payload: Partial<StorageBoxPayload>,
): Promise<StorageBox> {
  return updateItem<StorageBox, StorageBoxPayload>(
    API_ENDPOINTS.storageBoxes.detail(id),
    payload,
  );
}

export function deleteStorageBoxApi(id: string | number): Promise<void> {
  return deleteItem(API_ENDPOINTS.storageBoxes.detail(id));
}

export function getStorageFilesApi(
  params?: MasterDataQueryParams,
): Promise<StorageFile[]> {
  return getList<StorageFile>(
    API_ENDPOINTS.storageFiles.list,
    params,
  );
}

export function createStorageFileApi(
  payload: StorageFilePayload,
): Promise<StorageFile> {
  return createItem<StorageFile, StorageFilePayload>(
    API_ENDPOINTS.storageFiles.list,
    payload,
  );
}

export function updateStorageFileApi(
  id: string | number,
  payload: Partial<StorageFilePayload>,
): Promise<StorageFile> {
  return updateItem<StorageFile, StorageFilePayload>(
    API_ENDPOINTS.storageFiles.detail(id),
    payload,
  );
}

export function deleteStorageFileApi(id: string | number): Promise<void> {
  return deleteItem(API_ENDPOINTS.storageFiles.detail(id));
}