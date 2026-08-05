"use client";

import { useState, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";

import { ClientExcelCheckCard } from "@/features/imports/components/client-excel-check-card";
import { ProfileImportResultCard } from "@/features/imports/components/profile-import-result-card";
import {
  getCatalogsApi,
  getFondsApi,
  getStorageBoxesApi,
  getStorageFilesApi,
  getStorageLocationsApi,
  getWarehousesApi,
} from "@/features/master-data/api";
import {
  useDownloadProfileImportTemplate,
  useImportProfilesExcel,
} from "@/features/imports/hooks/use-profile-import";
import type {
  ClientExcelCheckResult,
  ClientExcelParsedRow,
  ProfileImportResult,
} from "@/features/imports/types";
import type {
  Catalog,
  Fond,
  StorageBox,
  StorageFile,
  StorageLocation,
  Warehouse,
} from "@/features/master-data/types";
import {
  checkExcelFileInBrowser,
  isExcelFile,
} from "@/features/imports/utils/import-utils";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatFileSize } from "@/lib/utils/format";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";




type ImportLocationSelection = {
  fondId: string;
  catalogId: string;
  warehouseId: string;
  locationId: string;
  boxId: string;
  storageFileId: string;
};

function createEmptyImportLocationSelection(): ImportLocationSelection {
  return {
    fondId: "",
    catalogId: "",
    warehouseId: "",
    locationId: "",
    boxId: "",
    storageFileId: "",
  };
}

function getAnyValue(source: unknown, keys: string[]): string {
  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function getIdValue(source: unknown): string {
  return getAnyValue(source, ["id"]);
}
function getListFromApiResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  const results = (data as { results?: unknown } | null | undefined)?.results;

  if (Array.isArray(results)) {
    return results as T[];
  }

  return [];
}


function getImportRowKey(row: ClientExcelParsedRow, sheetName: string): string {
  return [
    sheetName,
    row.rowNumber,
    row.profileCode,
    row.profileTitle,
  ].map((part) => String(part ?? "")).join("::");
}

function getCatalogOptionLabel(catalog: Catalog): string {
  const code = getAnyValue(catalog, ["code", "catalog_code"]);
  const name = getAnyValue(catalog, ["name", "title", "catalog_name"]);

  return [code, name].filter(Boolean).join(" - ") || `Mục lục #${getIdValue(catalog)}`;
}

function getFondOptionLabel(fond: Fond): string {
  const code = getAnyValue(fond, ["fond_code", "code"]);
  const name = getAnyValue(fond, ["name", "title", "fond_name"]);

  return [code, name].filter(Boolean).join(" - ") || `Phông #${getIdValue(fond)}`;
}

function getWarehouseOptionLabel(warehouse: Warehouse): string {
  const code = getAnyValue(warehouse, ["warehouse_code", "code"]);
  const name = getAnyValue(warehouse, ["name", "title", "warehouse_name"]);

  return [code, name].filter(Boolean).join(" - ") || `Kho #${getIdValue(warehouse)}`;
}

function getStorageLocationOptionLabel(location: StorageLocation): string {
  const code = getAnyValue(location, ["location_code", "code"]);
  const name = getAnyValue(location, ["name", "title", "location_name"]);
  const warehouse = getAnyValue(location, ["warehouse_name", "warehouseName"]);

  return [code || name || `Kệ/Vị trí #${getIdValue(location)}`, warehouse]
    .filter(Boolean)
    .join(" - ");
}

function getStorageBoxOptionLabel(box: StorageBox): string {
  const number = getAnyValue(box, ["box_number", "number", "code"]);
  const title = getAnyValue(box, ["title", "name"]);
  const location = getAnyValue(box, ["location_name", "locationName"]);

  return [`Hộp/Cặp ${number || getIdValue(box)}`, title, location]
    .filter(Boolean)
    .join(" - ");
}

function matchesParent(source: unknown, keys: string[], parentId: string): boolean {
  if (!parentId) return true;

  return keys.some((key) => getAnyValue(source, [key]) === parentId);
}

function filterCatalogsByFond(catalogs: Catalog[], fondId: string): Catalog[] {
  return catalogs.filter((catalog) =>
    matchesParent(catalog, ["fond", "fond_id", "fondId", "fond_pk"], fondId),
  );
}

function filterLocationsByWarehouse(
  locations: StorageLocation[],
  warehouseId: string,
): StorageLocation[] {
  return locations.filter((location) =>
    matchesParent(location, ["warehouse", "warehouse_id", "warehouseId"], warehouseId),
  );
}

function filterBoxesByLocation(
  boxes: StorageBox[],
  locationId: string,
): StorageBox[] {
  return boxes.filter((box) =>
    matchesParent(box, ["location", "storage_location", "location_id", "storage_location_id", "locationId"], locationId),
  );
}

function filterStorageFilesByBox(
  files: StorageFile[],
  boxId: string,
): StorageFile[] {
  return files.filter((file) =>
    matchesParent(file, ["box", "storage_box", "box_id", "storage_box_id", "boxId"], boxId),
  );
}


function getStorageFileOptionLabel(file: StorageFile): string {
  const warehouse = getAnyValue(file, ["warehouse_name", "warehouseName"]);
  const location = getAnyValue(file, ["location_name", "locationName"]);
  const box = getAnyValue(file, ["box_number", "boxNumber"]);
  const fileNumber = getAnyValue(file, [
    "file_number",
    "storage_file_number",
    "fileNumber",
    "code",
    "number",
  ]);
  const title = getAnyValue(file, ["title", "name"]);

  const boxLabel = box ? `Hộp ${box}` : "";
  const fileLabel = [fileNumber ? `Tệp ${fileNumber}` : "", title].filter(Boolean).join(" - ");

  return [warehouse, location, boxLabel, fileLabel || `Tệp #${getIdValue(file)}`]
    .filter(Boolean)
    .join(" → ");
}


function getFirstImportableSheet(result: ClientExcelCheckResult | null): string {
  const sheet = result?.sheets.find(
    (item) => item.validRows > 0 && item.errors.length === 0,
  );

  return sheet?.sheetName ?? "";
}


function getImportableSheetRows(
  result: ClientExcelCheckResult | null,
  sheetName: string,
) {
  const sheet = result?.sheets.find((item) => item.sheetName === sheetName);

  if (!sheet) return [];

  return sheet.parsedRows;
}

export function ProfileImportCard() {
  const downloadTemplateMutation = useDownloadProfileImportTemplate();
  const importMutation = useImportProfilesExcel();

  const catalogsQuery = useQuery({
    queryKey: ["profile-import-catalogs"],
    queryFn: () => getCatalogsApi({ page_size: 1000 }),
  });

  const storageFilesQuery = useQuery({
    queryKey: ["profile-import-storage-files"],
    queryFn: () => getStorageFilesApi({ page_size: 1000 }),
  });

  const fondsQuery = useQuery({
    queryKey: ["profile-import-fonds"],
    queryFn: () => getFondsApi({ page_size: 1000 }),
  });

  const warehousesQuery = useQuery({
    queryKey: ["profile-import-warehouses"],
    queryFn: () => getWarehousesApi({ page_size: 1000 }),
  });

  const storageLocationsQuery = useQuery({
    queryKey: ["profile-import-storage-locations"],
    queryFn: () => getStorageLocationsApi({ page_size: 1000 }),
  });

  const storageBoxesQuery = useQuery({
    queryKey: ["profile-import-storage-boxes"],
    queryFn: () => getStorageBoxesApi({ page_size: 1000 }),
  });


  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const [clientCheckResult, setClientCheckResult] =
    useState<ClientExcelCheckResult | null>(null);

  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [bulkLocation, setBulkLocation] = useState<ImportLocationSelection>(
    createEmptyImportLocationSelection,
  );
  const [rowLocations, setRowLocations] = useState<Record<string, ImportLocationSelection>>({});

  const [clientCheckDialogOpen, setClientCheckDialogOpen] = useState(false);

  const [serverImportResult, setServerImportResult] =
    useState<ProfileImportResult | null>(null);

  const [isCheckingInBrowser, setIsCheckingInBrowser] = useState(false);
  const fonds = getListFromApiResponse<Fond>(fondsQuery.data);
  const catalogs = getListFromApiResponse<Catalog>(catalogsQuery.data);
  const warehouses = getListFromApiResponse<Warehouse>(warehousesQuery.data);
  const storageLocations = getListFromApiResponse<StorageLocation>(
    storageLocationsQuery.data,
  );
  const storageBoxes = getListFromApiResponse<StorageBox>(storageBoxesQuery.data);
  const storageFiles = getListFromApiResponse<StorageFile>(storageFilesQuery.data);
function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setFormError(null);
    setClientCheckResult(null);
    setSelectedSheetName("");
    setBulkLocation(createEmptyImportLocationSelection());
    setRowLocations({});
    setClientCheckDialogOpen(false);
    setServerImportResult(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isExcelFile(file)) {
      setSelectedFile(null);
      setFormError("Chỉ được chọn file Excel .xlsx hoặc .xls.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleDownloadTemplate() {
    setFormError(null);

    try {
      await downloadTemplateMutation.mutateAsync();
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "Không tải được file mẫu Excel.",
        ),
      );
    }
  }

  async function handleCheckInBrowser() {
    setFormError(null);
    setServerImportResult(null);

    if (!selectedFile) {
      setFormError("Vui lòng chọn file Excel cần kiểm tra.");
      return;
    }

    setIsCheckingInBrowser(true);

    try {
      const result = await checkExcelFileInBrowser(selectedFile);
      setClientCheckResult(result);
      setSelectedSheetName(getFirstImportableSheet(result));
      setClientCheckDialogOpen(true);
    } catch {
      setFormError(
        "Không đọc được file Excel trên trình duyệt. Vui lòng kiểm tra lại file.",
      );
    } finally {
      setIsCheckingInBrowser(false);
    }
  }

  async function handleRealImport() {
    setFormError(null);

    if (!selectedFile) {
      setFormError("Vui lòng chọn file Excel cần import.");
      return;
    }

    if (!clientCheckResult) {
      setFormError("Vui lòng bấm Kiểm tra trên web trước khi Import thật.");
      return;
    }

    const targetSheetName =
      selectedSheetName || getFirstImportableSheet(clientCheckResult);

    const selectedSheet = clientCheckResult.sheets.find(
      (sheet) => sheet.sheetName === targetSheetName,
    );

    if (!selectedSheet) {
      setFormError("Vui lòng chọn sheet đủ điều kiện để import.");
      return;
    }

    if (selectedSheet.errors.length > 0 || selectedSheet.validRows <= 0) {
      setFormError("Sheet đã chọn còn lỗi hoặc không có hồ sơ hợp lệ để import.");
      return;
    }

    try {
      const rowsToImport = getImportableSheetRows(
        clientCheckResult,
        selectedSheet.sheetName,
      ).map((row) => {
        const key = getImportRowKey(row, selectedSheet.sheetName);
        const location = rowLocations[key] ?? bulkLocation;

        return {
          ...row,
          sheetName: selectedSheet.sheetName,
          catalog_id: location.catalogId,
          storage_file_id: location.storageFileId,
        };
      });
      const missingLocationRow = rowsToImport.find((row) => {
        const key = getImportRowKey(row, selectedSheet.sheetName);
        const location = rowLocations[key] ?? bulkLocation;

        return !isCompleteImportLocation(location);
      });
if (missingLocationRow) {
        setFormError(
          `Dòng ${missingLocationRow.rowNumber}: vui lòng chọn đủ Phông, Mục lục, Kho, Kệ/Vị trí, Hộp/Cặp và Tệp lưu trữ trước khi import.`,
        );
        return;
      }

      const nextResult = await importMutation.mutateAsync({
        file: selectedFile,
        dry_run: false,
        sheet_name: selectedSheet.sheetName,
        client_rows_json: JSON.stringify(rowsToImport),
      });

      setServerImportResult({
        ...nextResult,
        dry_run: false,
      });

      setSelectedFile(null);
      setClientCheckResult(null);
        setFileInputKey((current) => current + 1);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "Import Excel thất bại. Backend đang trả lỗi, cần xem log chi tiết.",
        ),
      );
    }
  }

  const isBusy =
    downloadTemplateMutation.isPending ||
    importMutation.isPending ||
    isCheckingInBrowser;
const selectedSheetRows = clientCheckResult && selectedSheetName
    ? getImportableSheetRows(clientCheckResult, selectedSheetName)
    : [];

  function updateBulkLocation(field: keyof ImportLocationSelection, value: string) {
    setBulkLocation((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateRowLocation(
    row: ClientExcelParsedRow,
    field: keyof ImportLocationSelection,
    value: string,
  ) {
    const key = getImportRowKey(row, selectedSheetName);

    setRowLocations((current) => {
      const existing = current[key] ?? bulkLocation;

      return {
        ...current,
        [key]: patchLocationSelection(existing, field, value),
      };
    });
  }

  function normalizeImportLocationSelection(
    next: ImportLocationSelection,
  ): ImportLocationSelection {
    const filteredCatalogs = filterCatalogsByFond(catalogs, next.fondId);
    const catalogOk =
      !next.catalogId || filteredCatalogs.some((item) => getIdValue(item) === next.catalogId);

    const filteredLocations = filterLocationsByWarehouse(storageLocations, next.warehouseId);
    const locationOk =
      !next.locationId || filteredLocations.some((item) => getIdValue(item) === next.locationId);

    const filteredBoxes = filterBoxesByLocation(storageBoxes, next.locationId);
    const boxOk = !next.boxId || filteredBoxes.some((item) => getIdValue(item) === next.boxId);

    const filteredFiles = filterStorageFilesByBox(storageFiles, next.boxId);
    const fileOk =
      !next.storageFileId || filteredFiles.some((item) => getIdValue(item) === next.storageFileId);

    return {
      ...next,
      catalogId: catalogOk ? next.catalogId : "",
      locationId: locationOk ? next.locationId : "",
      boxId: boxOk ? next.boxId : "",
      storageFileId: fileOk ? next.storageFileId : "",
    };
  }

  function patchLocationSelection(
    current: ImportLocationSelection,
    field: keyof ImportLocationSelection,
    value: string,
  ): ImportLocationSelection {
    const next = {
      ...current,
      [field]: value,
    };

    if (field === "fondId") {
      next.catalogId = "";
    }

    if (field === "warehouseId") {
      next.locationId = "";
      next.boxId = "";
      next.storageFileId = "";
    }

    if (field === "locationId") {
      next.boxId = "";
      next.storageFileId = "";
    }

    if (field === "boxId") {
      next.storageFileId = "";
    }

    return normalizeImportLocationSelection(next);
  }

  function getFilteredCatalogs(selection: ImportLocationSelection): Catalog[] {
    return filterCatalogsByFond(catalogs, selection.fondId);
  }

  function getFilteredLocations(selection: ImportLocationSelection): StorageLocation[] {
    return filterLocationsByWarehouse(storageLocations, selection.warehouseId);
  }

  function getFilteredBoxes(selection: ImportLocationSelection): StorageBox[] {
    return filterBoxesByLocation(storageBoxes, selection.locationId);
  }

  function getFilteredStorageFiles(selection: ImportLocationSelection): StorageFile[] {
    return filterStorageFilesByBox(storageFiles, selection.boxId);
  }

  function isCompleteImportLocation(selection: ImportLocationSelection): boolean {
    return Boolean(
      selection.fondId &&
        selection.catalogId &&
        selection.warehouseId &&
        selection.locationId &&
        selection.boxId &&
        selection.storageFileId,
    );
  }

  function applyBulkLocationToRows() {
    if (!selectedSheetName || selectedSheetRows.length === 0) return;

    setRowLocations((current) => {
      const next = { ...current };

      for (const row of selectedSheetRows) {
        next[getImportRowKey(row, selectedSheetName)] = { ...bulkLocation };
      }

      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import hồ sơ từ Excel</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kiểm tra Excel ngay trên web trước, sau đó mới import thật vào database.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {formError}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-md border bg-muted/30 p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="font-medium">Bước 1: Tải file mẫu</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dùng file mẫu để nhập đúng các cột mà hệ thống hỗ trợ.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                disabled={isBusy}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadTemplateMutation.isPending
                  ? "Đang tải..."
                  : "Tải Excel mẫu"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Bước 2: Chọn file Excel</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                File sẽ được đọc trên trình duyệt khi bấm Kiểm tra trên web.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-import-file">
                File Excel
              </Label>

              <Input
                key={fileInputKey}
                id="profile-import-file"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileChange}
                disabled={isBusy}
              />
            </div>

            {selectedFile ? (
              <div className="flex flex-wrap items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />

                <Badge variant="secondary">
                  {selectedFile.name}
                </Badge>

                <Badge variant="outline">
                  {formatFileSize(selectedFile.size)}
                </Badge>
              </div>
            ) : null}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Bước 3: Kiểm tra trên web rồi import</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Kiểm tra trên web không gửi file lên backend. Import thật mới gửi file và lưu database.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckInBrowser}
                disabled={!selectedFile || isBusy}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isCheckingInBrowser
                  ? "Đang đọc Excel..."
                  : "Kiểm tra trên web"}
              </Button>

              <Button
                type="button"
                onClick={handleRealImport}
                disabled={!selectedFile || isBusy}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                {importMutation.isPending
                  ? "Đang import..."
                  : "Import thật"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {clientCheckResult ? (
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Chọn sheet hợp lệ để import</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sheet bị lỗi sẽ bị khóa. Import thật chỉ tạo hồ sơ từ sheet đang chọn.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[220px_1fr] md:items-center">
              <Label htmlFor="profile-import-sheet">Sheet sẽ import</Label>

              <select
                id="profile-import-sheet"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={selectedSheetName}
                onChange={(event) => setSelectedSheetName(event.target.value)}
              >
                <option value="">Chọn sheet đủ điều kiện</option>

                {clientCheckResult.sheets.map((sheet) => {
                  const canImport = sheet.validRows > 0 && sheet.errors.length === 0;

                  return (
                    <option
                      key={sheet.sheetName}
                      value={sheet.sheetName}
                      disabled={!canImport}
                    >
                      {sheet.sheetName} - hợp lệ {sheet.validRows}, lỗi {sheet.errors.length}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {clientCheckResult.sheets.map((sheet) => {
                const canImport = sheet.validRows > 0 && sheet.errors.length === 0;

                return (
                  <Badge
                    key={sheet.sheetName}
                    variant={canImport ? "secondary" : "destructive"}
                  >
                    {sheet.sheetName}: {canImport ? "có thể import" : "có lỗi"}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}


      {clientCheckResult && selectedSheetRows.length > 0 ? (
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Gán vị trí lưu trước khi import</CardTitle>
            <p className="text-sm text-muted-foreground">
              Chọn đủ chuỗi Phông → Mục lục → Kho → Kệ/Vị trí → Hộp/Cặp → Tệp lưu trữ cho từng hồ sơ.
              Khi import, hệ thống lưu hồ sơ vào đúng Mục lục và Tệp lưu trữ đã chọn.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="mb-2 text-sm font-medium">
                Gán nhanh cho tất cả dòng đang chọn
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="space-y-1">
                  <Label>Phông</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={bulkLocation.fondId}
                    onChange={(event) => updateBulkLocation("fondId", event.target.value)}
                  >
                    <option value="">Chọn phông</option>
                    {fonds.map((fond) => (
                      <option key={getIdValue(fond)} value={getIdValue(fond)}>
                        {getFondOptionLabel(fond)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Mục lục</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={bulkLocation.catalogId}
                    onChange={(event) => updateBulkLocation("catalogId", event.target.value)}
                    disabled={!bulkLocation.fondId}
                  >
                    <option value="">Chọn mục lục</option>
                    {getFilteredCatalogs(bulkLocation).map((catalog) => (
                      <option key={getIdValue(catalog)} value={getIdValue(catalog)}>
                        {getCatalogOptionLabel(catalog)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Kho</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={bulkLocation.warehouseId}
                    onChange={(event) => updateBulkLocation("warehouseId", event.target.value)}
                  >
                    <option value="">Chọn kho</option>
                    {warehouses.map((warehouse) => (
                      <option key={getIdValue(warehouse)} value={getIdValue(warehouse)}>
                        {getWarehouseOptionLabel(warehouse)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Kệ/Vị trí</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={bulkLocation.locationId}
                    onChange={(event) => updateBulkLocation("locationId", event.target.value)}
                    disabled={!bulkLocation.warehouseId}
                  >
                    <option value="">Chọn kệ/vị trí</option>
                    {getFilteredLocations(bulkLocation).map((location) => (
                      <option key={getIdValue(location)} value={getIdValue(location)}>
                        {getStorageLocationOptionLabel(location)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Hộp/Cặp</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={bulkLocation.boxId}
                    onChange={(event) => updateBulkLocation("boxId", event.target.value)}
                    disabled={!bulkLocation.locationId}
                  >
                    <option value="">Chọn hộp/cặp</option>
                    {getFilteredBoxes(bulkLocation).map((box) => (
                      <option key={getIdValue(box)} value={getIdValue(box)}>
                        {getStorageBoxOptionLabel(box)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Tệp lưu trữ</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={bulkLocation.storageFileId}
                    onChange={(event) => updateBulkLocation("storageFileId", event.target.value)}
                    disabled={!bulkLocation.boxId}
                  >
                    <option value="">Chọn tệp lưu trữ</option>
                    {getFilteredStorageFiles(bulkLocation).map((file) => (
                      <option key={getIdValue(file)} value={getIdValue(file)}>
                        {getStorageFileOptionLabel(file)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyBulkLocationToRows}
                  disabled={!isCompleteImportLocation(bulkLocation)}
                >
                  Áp dụng cho tất cả
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Dòng</th>
                    <th className="px-3 py-2">Mã hồ sơ</th>
                    <th className="px-3 py-2">Tên hồ sơ</th>
                    <th className="px-3 py-2">Phông</th>
                    <th className="px-3 py-2">Mục lục</th>
                    <th className="px-3 py-2">Kho</th>
                    <th className="px-3 py-2">Kệ/Vị trí</th>
                    <th className="px-3 py-2">Hộp/Cặp</th>
                    <th className="px-3 py-2">Tệp lưu trữ</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedSheetRows.map((row) => {
                    const key = getImportRowKey(row, selectedSheetName);
                    const location = rowLocations[key] ?? bulkLocation;

                    return (
                      <tr key={key} className="border-t">
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2 font-medium">{row.profileCode}</td>
                        <td className="px-3 py-2">{row.profileTitle}</td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                            value={location.fondId}
                            onChange={(event) =>
                              updateRowLocation(row, "fondId", event.target.value)
                            }
                          >
                            <option value="">Chọn phông</option>
                            {fonds.map((fond) => (
                              <option key={getIdValue(fond)} value={getIdValue(fond)}>
                                {getFondOptionLabel(fond)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                            value={location.catalogId}
                            onChange={(event) =>
                              updateRowLocation(row, "catalogId", event.target.value)
                            }
                            disabled={!location.fondId}
                          >
                            <option value="">Chọn mục lục</option>
                            {getFilteredCatalogs(location).map((catalog) => (
                              <option key={getIdValue(catalog)} value={getIdValue(catalog)}>
                                {getCatalogOptionLabel(catalog)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                            value={location.warehouseId}
                            onChange={(event) =>
                              updateRowLocation(row, "warehouseId", event.target.value)
                            }
                          >
                            <option value="">Chọn kho</option>
                            {warehouses.map((warehouse) => (
                              <option key={getIdValue(warehouse)} value={getIdValue(warehouse)}>
                                {getWarehouseOptionLabel(warehouse)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                            value={location.locationId}
                            onChange={(event) =>
                              updateRowLocation(row, "locationId", event.target.value)
                            }
                            disabled={!location.warehouseId}
                          >
                            <option value="">Chọn kệ/vị trí</option>
                            {getFilteredLocations(location).map((storageLocation) => (
                              <option
                                key={getIdValue(storageLocation)}
                                value={getIdValue(storageLocation)}
                              >
                                {getStorageLocationOptionLabel(storageLocation)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                            value={location.boxId}
                            onChange={(event) =>
                              updateRowLocation(row, "boxId", event.target.value)
                            }
                            disabled={!location.locationId}
                          >
                            <option value="">Chọn hộp/cặp</option>
                            {getFilteredBoxes(location).map((box) => (
                              <option key={getIdValue(box)} value={getIdValue(box)}>
                                {getStorageBoxOptionLabel(box)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                            value={location.storageFileId}
                            onChange={(event) =>
                              updateRowLocation(row, "storageFileId", event.target.value)
                            }
                            disabled={!location.boxId}
                          >
                            <option value="">Chọn tệp lưu trữ</option>
                            {getFilteredStorageFiles(location).map((file) => (
                              <option key={getIdValue(file)} value={getIdValue(file)}>
                                {getStorageFileOptionLabel(file)}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={clientCheckDialogOpen} onOpenChange={setClientCheckDialogOpen}>
        <DialogContent className="h-[94vh] w-[96vw] max-w-none overflow-hidden p-0 sm:!max-w-[96vw] xl:!max-w-[1500px]">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Kết quả kiểm tra Excel trên web</DialogTitle>
          </DialogHeader>

          <div className="h-[calc(94vh-72px)] overflow-auto px-5 py-4">
            <ClientExcelCheckCard result={clientCheckResult} />
          </div>
        </DialogContent>
      </Dialog>

      <ProfileImportResultCard result={serverImportResult} />
    </div>
  );
}