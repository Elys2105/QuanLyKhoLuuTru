"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CloudUpload, Database, Plus, Trash2, WifiOff } from "lucide-react";

import type { Catalog, StorageFile } from "@/features/master-data/types";
import type { Profile, ProfilePayload } from "@/features/profiles/types";
import {
  addOfflineProfile,
  getOfflineProfileCache,
  getOfflineProfiles,
  removeOfflineProfile,
  saveOfflineProfileCache,
  updateOfflineProfile,
  type OfflineProfileItem,
} from "@/features/profiles/offline/offline-profile-storage";

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
import { Textarea } from "@/components/ui/textarea";

interface OfflineProfilesCardProps {
  catalogs: Catalog[];
  storageFiles: StorageFile[];
  profiles: Profile[];
  isSyncing?: boolean;
  onSyncProfile: (payload: ProfilePayload) => Promise<void>;
}

interface OfflineFormValues {
  catalog: string;
  storage_file: string;
  profile_code: string;
  title: string;
  description: string;
  year: string;
  total_pages: string;
  retention_period: string;
  language: string;
  notes: string;
}

const DEFAULT_VALUES: OfflineFormValues = {
  catalog: "",
  storage_file: "",
  profile_code: "",
  title: "",
  description: "",
  year: "",
  total_pages: "",
  retention_period: "",
  language: "vi",
  notes: "",
};

function readText(item: unknown, keys: string[]): string {
  if (!item || typeof item !== "object") return "";

  const record = item as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return "";
}

function getItemId(item: unknown): string {
  return readText(item, ["id"]);
}

function getCatalogLabel(item: Catalog): string {
  const code = readText(item, ["catalog_code", "code"]);
  const name = readText(item, ["catalog_name", "name", "title"]);

  return [code, name].filter(Boolean).join(" - ") || `Mục lục #${getItemId(item)}`;
}

function getStorageFileLabel(item: StorageFile): string {
  const number = readText(item, [
    "storage_file_number",
    "file_number",
    "number",
    "code",
  ]);

  const title = readText(item, [
    "storage_file_title",
    "title",
    "name",
  ]);

  const box = readText(item, ["box_number", "storage_box_number"]);

  const mainText = [number, title].filter(Boolean).join(" - ");

  return [box ? `Hộp ${box}` : "", mainText || `Tệp #${getItemId(item)}`]
    .filter(Boolean)
    .join(" / ");
}

function parseOptionalNumber(label: string, value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} phải là số.`);
  }

  return parsed;
}

function buildPayload(values: OfflineFormValues): ProfilePayload {
  const catalog = values.catalog.trim();
  const storageFile = values.storage_file.trim();
  const profileCode = values.profile_code.trim();
  const title = values.title.trim();

  if (!catalog) {
    throw new Error("Chưa chọn hoặc nhập ID mục lục.");
  }

  if (!storageFile) {
    throw new Error("Chưa chọn hoặc nhập ID tệp.");
  }

  if (!profileCode) {
    throw new Error("Chưa nhập mã hồ sơ.");
  }

  if (!title) {
    throw new Error("Chưa nhập tên hồ sơ.");
  }

  return {
    catalog,
    storage_file: storageFile,
    profile_code: profileCode,
    title,
    description: values.description.trim() || undefined,
    year: parseOptionalNumber("Năm", values.year),
    total_pages: parseOptionalNumber("Tổng số trang", values.total_pages),
    retention_period: values.retention_period.trim() || null,
    language: values.language.trim() || "vi",
    notes: values.notes.trim() || undefined,
  };
}

function formatDateTime(value?: string): string {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

export function OfflineProfilesCard({
  catalogs,
  storageFiles,
  profiles,
  isSyncing,
  onSyncProfile,
}: OfflineProfilesCardProps) {
  const [values, setValues] = useState<OfflineFormValues>(DEFAULT_VALUES);
  const [offlineItems, setOfflineItems] = useState<OfflineProfileItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | undefined>();

  useEffect(() => {
    setOfflineItems(getOfflineProfiles());

    const cache = getOfflineProfileCache();
    setCacheUpdatedAt(cache.updatedAt);
  }, []);

  useEffect(() => {
    const shouldSaveCache =
      catalogs.length > 0 ||
      storageFiles.length > 0 ||
      profiles.length > 0;

    if (!shouldSaveCache) return;

    const cache = saveOfflineProfileCache({
      catalogs,
      storageFiles,
      profiles,
    });

    setCacheUpdatedAt(cache.updatedAt);
  }, [catalogs, storageFiles, profiles]);

  const cachedData = useMemo(() => getOfflineProfileCache(), [
    cacheUpdatedAt,
  ]);

  const catalogOptions =
    catalogs.length > 0 ? catalogs : (cachedData.catalogs as Catalog[]);

  const storageFileOptions =
    storageFiles.length > 0
      ? storageFiles
      : (cachedData.storageFiles as StorageFile[]);

  function reloadOfflineItems() {
    setOfflineItems(getOfflineProfiles());
  }

  function updateValue<K extends keyof OfflineFormValues>(
    key: K,
    value: OfflineFormValues[K],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  function handleSaveOffline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload = buildPayload(values);
      addOfflineProfile(payload);
      reloadOfflineItems();
      setValues(DEFAULT_VALUES);
      setMessage("Đã lưu hồ sơ vào hàng chờ offline.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được hồ sơ offline.");
    }
  }

  async function handleSyncOne(item: OfflineProfileItem) {
    setSyncingId(item.id);
    setMessage(null);

    try {
      await onSyncProfile(item.payload);
      removeOfflineProfile(item.id);
      reloadOfflineItems();
      setMessage(`Đã đồng bộ hồ sơ ${item.payload.profile_code}.`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Đồng bộ thất bại.";

      updateOfflineProfile(item.id, {
        status: "failed",
        errorMessage,
      });

      reloadOfflineItems();
      setMessage(errorMessage);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleSyncAll() {
    const pendingItems = getOfflineProfiles();

    for (const item of pendingItems) {
      await handleSyncOne(item);
    }
  }

  function handleRemove(id: string) {
    const ok = window.confirm("Xóa hồ sơ offline này khỏi hàng chờ?");

    if (!ok) return;

    removeOfflineProfile(id);
    reloadOfflineItems();
  }

  const canSync = offlineItems.length > 0 && !isSyncing && !syncingId;

  return null;
}