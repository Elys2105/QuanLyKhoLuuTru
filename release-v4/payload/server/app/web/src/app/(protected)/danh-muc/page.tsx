"use client";

import { useQuery } from "@tanstack/react-query";

import { MasterDataManager } from "@/features/master-data/components/master-data-manager";
import {
  createCatalogApi,
  createFondApi,
  createStorageBoxApi,
  createStorageFileApi,
  createStorageLocationApi,
  createWarehouseApi,
  deleteCatalogApi,
  deleteFondApi,
  deleteStorageBoxApi,
  deleteStorageFileApi,
  deleteStorageLocationApi,
  deleteWarehouseApi,
  getCatalogsApi,
  getFondsApi,
  getStorageBoxesApi,
  getStorageFilesApi,
  getStorageLocationsApi,
  getWarehousesApi,
  updateCatalogApi,
  updateFondApi,
  updateStorageBoxApi,
  updateStorageFileApi,
  updateStorageLocationApi,
  updateWarehouseApi,
} from "@/features/master-data/api";
import type {
  Catalog,
  CatalogPayload,
  Fond,
  FondPayload,
  MasterDataFormValues,
  MasterDataOption,
  StorageBox,
  StorageBoxPayload,
  StorageFile,
  StorageFilePayload,
  StorageLocation,
  StorageLocationPayload,
  Warehouse,
  WarehousePayload,
} from "@/features/master-data/types";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function buildFondPayload(values: MasterDataFormValues): FondPayload {
  return {
    code: values.code,
    name: values.name,
    description: values.description || undefined,
    start_year: values.start_year ? Number(values.start_year) : null,
    end_year: values.end_year ? Number(values.end_year) : null,
  };
}

function buildCatalogPayload(values: MasterDataFormValues): CatalogPayload {
  return {
    fond: values.fond,
    code: values.code,
    name: values.name,
    description: values.description || undefined,
  };
}

function buildWarehousePayload(values: MasterDataFormValues): WarehousePayload {
  return {
    code: values.code,
    name: values.name,
    address: values.address || undefined,
    description: values.description || undefined,
  };
}

function buildLocationPayload(
  values: MasterDataFormValues,
): StorageLocationPayload {
  return {
    warehouse: values.warehouse,
    code: values.code,
    name: values.name,
    description: values.description || undefined,
  };
}

function buildBoxPayload(values: MasterDataFormValues): StorageBoxPayload {
  return {
    location: values.location,
    fond: values.fond || undefined,
    catalog: values.catalog || undefined,
    box_number: values.box_number,
    title: values.title || undefined,
    description: values.description || undefined,
  };
}

function buildStorageFilePayload(
  values: MasterDataFormValues,
): StorageFilePayload {
  return {
    box: values.box,
    file_number: values.file_number,
    title: values.title || undefined,
    description: values.description || undefined,
  };
}

export default function MasterDataPage() {
  const fondsQuery = useQuery({
    queryKey: ["fonds", "options"],
    queryFn: () => getFondsApi({ page_size: 1000 }),
  });

  const catalogsQuery = useQuery({
    queryKey: ["catalogs", "options"],
    queryFn: () => getCatalogsApi({ page_size: 1000 }),
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: () => getWarehousesApi({ page_size: 1000 }),
  });

  const locationsQuery = useQuery({
    queryKey: ["storage-locations", "options"],
    queryFn: () => getStorageLocationsApi({ page_size: 1000 }),
  });

  const boxesQuery = useQuery({
    queryKey: ["storage-boxes", "options"],
    queryFn: () => getStorageBoxesApi({ page_size: 1000 }),
  });

  const fondOptions: MasterDataOption[] = (fondsQuery.data ?? []).map(
    (fond) => ({
      value: String(fond.id),
      label: `${fond.code} - ${fond.name}`,
    }),
  );

  const catalogOptions: MasterDataOption[] = (
    catalogsQuery.data ?? []
  ).map((catalog) => ({
    value: String(catalog.id),
    label: `${catalog.code} - ${catalog.name}`,
  }));

  const warehouseOptions: MasterDataOption[] = (
    warehousesQuery.data ?? []
  ).map((warehouse) => ({
    value: String(warehouse.id),
    label: `${warehouse.code} - ${warehouse.name}`,
  }));

  const locationOptions: MasterDataOption[] = (
    locationsQuery.data ?? []
  ).map((location) => ({
    value: String(location.id),
    label: `${location.code} - ${location.name}`,
  }));

  const boxOptions: MasterDataOption[] = (boxesQuery.data ?? []).map(
    (box) => ({
      value: String(box.id),
      label: `Hộp ${box.box_number} - ${box.title || ""}`,
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Danh mục nền</h2>
        <p className="text-sm text-muted-foreground">
          Quản lý toàn bộ dữ liệu nền: phông, mục lục, kho, vị trí, hộp / cặp và tệp.
        </p>
      </div>

      <Tabs defaultValue="fonds" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="fonds">Phông</TabsTrigger>
          <TabsTrigger value="catalogs">Mục lục</TabsTrigger>
          <TabsTrigger value="warehouses">Kho / Kệ - Vị trí</TabsTrigger>
          <TabsTrigger value="boxes">Hộp / Cặp & Tệp</TabsTrigger>
        </TabsList>

        <TabsContent value="fonds">
          <MasterDataManager<Fond, FondPayload>
            title="Phông lưu trữ"
            description="Tạo, sửa, xóa phông lưu trữ."
            queryKey={["fonds"]}
            listFn={() => getFondsApi({ page_size: 1000 })}
            createFn={createFondApi}
            updateFn={updateFondApi}
            deleteFn={deleteFondApi}
            getItemTitle={(item) => item.name}
            buildPayload={buildFondPayload}
            fields={[
              {
                name: "code",
                label: "Mã phông",
                type: "text",
                required: true,
                placeholder: "Ví dụ: UBND-XA-A",
              },
              {
                name: "name",
                label: "Tên phông",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Ủy ban nhân dân xã A",
              },
              {
                name: "start_year",
                label: "Năm bắt đầu",
                type: "number",
              },
              {
                name: "end_year",
                label: "Năm kết thúc",
                type: "number",
              },
              {
                name: "description",
                label: "Mô tả",
                type: "textarea",
              },
            ]}
            columns={[
              { key: "code", label: "Mã phông" },
              { key: "name", label: "Tên phông" },
              {
                key: "start_year",
                label: "Thời gian",
                render: (item) =>
                  `${item.start_year ?? "-"} - ${item.end_year ?? "nay"}`,
              },
              { key: "description", label: "Mô tả" },
            ]}
          />
        </TabsContent>

        <TabsContent value="catalogs">
          <MasterDataManager<Catalog, CatalogPayload>
            title="Mục lục hồ sơ"
            description="Tạo, sửa, xóa mục lục theo phông."
            queryKey={["catalogs"]}
            listFn={() => getCatalogsApi({ page_size: 1000 })}
            createFn={createCatalogApi}
            updateFn={updateCatalogApi}
            deleteFn={deleteCatalogApi}
            getItemTitle={(item) => item.name}
            buildPayload={buildCatalogPayload}
            fields={[
              {
                name: "fond",
                label: "Phông",
                type: "select",
                required: true,
                options: fondOptions,
                placeholder: "Chọn phông",
              },
              {
                name: "code",
                label: "Mã mục lục",
                type: "text",
                required: true,
                placeholder: "Ví dụ: ML-2025",
              },
              {
                name: "name",
                label: "Tên mục lục",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Mục lục hồ sơ năm 2025",
              },
              {
                name: "description",
                label: "Mô tả",
                type: "textarea",
              },
            ]}
            columns={[
              { key: "code", label: "Mã mục lục" },
              { key: "name", label: "Tên mục lục" },
              {
                key: "fond_name",
                label: "Phông",
                render: (item) =>
                  item.fond_code
                    ? `${item.fond_code} - ${item.fond_name ?? ""}`
                    : item.fond_name ?? "-",
              },
              { key: "description", label: "Mô tả" },
            ]}
          />
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <MasterDataManager<Warehouse, WarehousePayload>
            title="Kho"
            description="Tạo, sửa, xóa kho lưu trữ."
            queryKey={["warehouses"]}
            listFn={() => getWarehousesApi({ page_size: 1000 })}
            createFn={createWarehouseApi}
            updateFn={updateWarehouseApi}
            deleteFn={deleteWarehouseApi}
            getItemTitle={(item) => item.name}
            buildPayload={buildWarehousePayload}
            fields={[
              {
                name: "code",
                label: "Mã kho",
                type: "text",
                required: true,
                placeholder: "Ví dụ: KHO-01",
              },
              {
                name: "name",
                label: "Tên kho",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Kho lưu trữ số 01",
              },
              {
                name: "address",
                label: "Địa chỉ/Tầng",
                type: "text",
              },
              {
                name: "description",
                label: "Mô tả",
                type: "textarea",
              },
            ]}
            columns={[
              { key: "code", label: "Mã kho" },
              { key: "name", label: "Tên kho" },
              { key: "address", label: "Địa chỉ/Tầng" },
              { key: "description", label: "Mô tả" },
            ]}
          />

          <MasterDataManager<StorageLocation, StorageLocationPayload>
            title="Kệ / Vị trí"
            description="Tạo, sửa, xóa kệ / vị trí trong kho."
            queryKey={["storage-locations"]}
            listFn={() => getStorageLocationsApi({ page_size: 1000 })}
            createFn={createStorageLocationApi}
            updateFn={updateStorageLocationApi}
            deleteFn={deleteStorageLocationApi}
            getItemTitle={(item) => item.name}
            buildPayload={buildLocationPayload}
            fields={[
              {
                name: "warehouse",
                label: "Kho",
                type: "select",
                required: true,
                options: warehouseOptions,
                placeholder: "Chọn kho",
              },
              {
                name: "code",
                label: "Mã kệ / vị trí",
                type: "text",
                required: true,
                placeholder: "Ví dụ: KE-A",
              },
              {
                name: "name",
                label: "Tên kệ / vị trí",
                type: "text",
                required: true,
                placeholder: "Ví dụ: Kệ A",
              },
              {
                name: "description",
                label: "Mô tả",
                type: "textarea",
              },
            ]}
            columns={[
              { key: "code", label: "Mã kệ / vị trí" },
              { key: "name", label: "Tên kệ / vị trí" },
              {
                key: "warehouse_name",
                label: "Kho",
                render: (item) =>
                  item.warehouse_code
                    ? `${item.warehouse_code} - ${item.warehouse_name ?? ""}`
                    : item.warehouse_name ?? "-",
              },
              { key: "description", label: "Mô tả" },
            ]}
          />
        </TabsContent>

        <TabsContent value="boxes" className="space-y-4">
          <MasterDataManager<StorageBox, StorageBoxPayload>
            title="Hộp / Cặp"
            description="Tạo, sửa, xóa hộp / cặp lưu trữ."
            queryKey={["storage-boxes"]}
            listFn={() => getStorageBoxesApi({ page_size: 1000 })}
            createFn={createStorageBoxApi}
            updateFn={updateStorageBoxApi}
            deleteFn={deleteStorageBoxApi}
            getItemTitle={(item) => item.title || item.box_number}
            buildPayload={buildBoxPayload}
            fields={[
              {
                name: "location",
                label: "Kệ / Vị trí",
                type: "select",
                required: true,
                options: locationOptions,
                placeholder: "Chọn kệ / vị trí",
              },
              {
                name: "fond",
                label: "Phông",
                type: "select",
                required: true,
                options: fondOptions,
                placeholder: "Chọn phông",
              },
              {
                name: "catalog",
                label: "Mục lục",
                type: "select",
                required: true,
                options: catalogOptions,
                placeholder: "Chọn mục lục",
              },
              {
                name: "box_number",
                label: "Số hộp / cặp",
                type: "text",
                required: true,
                placeholder: "Ví dụ: 12",
              },
              {
                name: "title",
                label: "Tiêu đề hộp / cặp",
                type: "text",
              },
              {
                name: "description",
                label: "Mô tả",
                type: "textarea",
              },
            ]}
            columns={[
              { key: "box_number", label: "Số hộp / cặp" },
              { key: "title", label: "Tiêu đề" },
              {
                key: "location_name",
                label: "Kệ / Vị trí",
                render: (item) =>
                  item.location_code
                    ? `${item.location_code} - ${item.location_name ?? ""}`
                    : item.location_name ?? "-",
              },
              {
                key: "catalog_name",
                label: "Mục lục",
                render: (item) =>
                  item.catalog_code
                    ? `${item.catalog_code} - ${item.catalog_name ?? ""}`
                    : item.catalog_name ?? "-",
              },
            ]}
          />

          <MasterDataManager<StorageFile, StorageFilePayload>
            title="Tệp"
            description="Tạo, sửa, xóa tệp trong hộp / cặp."
            queryKey={["storage-files"]}
            listFn={() => getStorageFilesApi({ page_size: 1000 })}
            createFn={createStorageFileApi}
            updateFn={updateStorageFileApi}
            deleteFn={deleteStorageFileApi}
            getItemTitle={(item) => item.title || item.file_number}
            buildPayload={buildStorageFilePayload}
            fields={[
              {
                name: "box",
                label: "Hộp / Cặp",
                type: "select",
                required: true,
                options: boxOptions,
                placeholder: "Chọn hộp / cặp",
              },
              {
                name: "file_number",
                label: "Số tệp",
                type: "text",
                required: true,
                placeholder: "Ví dụ: 03",
              },
              {
                name: "title",
                label: "Tiêu đề tệp",
                type: "text",
              },
              {
                name: "description",
                label: "Mô tả",
                type: "textarea",
              },
            ]}
            columns={[
              { key: "file_number", label: "Số tệp" },
              { key: "title", label: "Tiêu đề" },
              {
                key: "box_number",
                label: "Hộp / Cặp",
                render: (item) => item.box_number ?? "-",
              },
              { key: "description", label: "Mô tả" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}