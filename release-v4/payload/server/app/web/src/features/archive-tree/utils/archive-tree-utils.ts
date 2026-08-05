import type {
  ArchiveTreeBox,
  ArchiveTreeDigitalFile,
  ArchiveTreeLocation,
  ArchiveTreeProfile,
  ArchiveTreeStorageFile,
  ArchiveTreeSummary,
  ArchiveTreeWarehouse,
} from "@/features/archive-tree/types";

export function getSummaryValue(
  summary: ArchiveTreeSummary | undefined,
  keys: Array<keyof ArchiveTreeSummary>,
): number {
  if (!summary) return 0;

  for (const key of keys) {
    const value = summary[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return 0;
}

export function getWarehouseLocations(
  warehouse: ArchiveTreeWarehouse,
): ArchiveTreeLocation[] {
  return warehouse.locations ?? [];
}

export function getLocationBoxes(
  location: ArchiveTreeLocation,
): ArchiveTreeBox[] {
  return location.boxes ?? [];
}

export function getBoxStorageFiles(
  box: ArchiveTreeBox,
): ArchiveTreeStorageFile[] {
  return box.storage_files ?? [];
}

export function getStorageFileProfiles(
  storageFile: ArchiveTreeStorageFile,
): ArchiveTreeProfile[] {
  return storageFile.profiles ?? [];
}

export function getProfileDigitalFiles(
  profile: ArchiveTreeProfile,
): ArchiveTreeDigitalFile[] {
  return profile.digital_files ?? [];
}

export function getStorageFileNumber(
  storageFile: ArchiveTreeStorageFile,
): string {
  return (
    storageFile.file_number ||
    storageFile.storage_file_number ||
    String(storageFile.id)
  );
}

export function getStorageFileTitle(
  storageFile: ArchiveTreeStorageFile,
): string {
  return (
    storageFile.title ||
    storageFile.storage_file_title ||
    `Tệp ${getStorageFileNumber(storageFile)}`
  );
}

export function getBoxTitle(box: ArchiveTreeBox): string {
  return box.title || box.box_title || `Hộp ${box.box_number}`;
}

export function profileHasPdf(profile: ArchiveTreeProfile): boolean {
  return (
    Boolean(profile.has_pdf) ||
    Boolean(profile.digital_file_count) ||
    getProfileDigitalFiles(profile).length > 0
  );
}