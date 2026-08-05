"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";

import { getDigitalFilesApi } from "@/features/digital-files/api";
import { ProfileImportCard } from "@/features/imports/components/profile-import-card";
import {
  getCatalogsApi,
  getFondsApi,
  getStorageBoxesApi,
  getStorageFilesApi,
  getStorageLocationsApi,
  getWarehousesApi,
} from "@/features/master-data/api";
import { ProfileFormDialog } from "@/features/profiles/components/profile-form-dialog";
import { OfflineProfilesCard } from "@/features/profiles/components/offline-profiles-card";
import { ProfilesPageSkeleton } from "@/features/profiles/components/profiles-page-skeleton";
import { ProfilesTable } from "@/features/profiles/components/profiles-table";
import {
  useProfileMutations,
  useProfiles,
} from "@/features/profiles/hooks/use-profiles";
import type {
  Profile,
  ProfilePayload,
} from "@/features/profiles/types";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilesPage() {
  const [openForm, setOpenForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const profilesQuery = useProfiles({
    page: 1,
    page_size: 1000,
    ordering: "-created_at",
  });

  const digitalFilesQuery = useQuery({
    queryKey: ["digital-files", "profiles-page"],
    queryFn: () =>
      getDigitalFilesApi({
        page: 1,
        page_size: 1000,
      }),
  });

  const fondsQuery = useQuery({
    queryKey: ["fonds", "profile-options"],
    queryFn: () => getFondsApi({ page_size: 1000 }),
  });

  const catalogsQuery = useQuery({
    queryKey: ["catalogs", "profile-options"],
    queryFn: () => getCatalogsApi({ page_size: 1000 }),
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "profile-options"],
    queryFn: () => getWarehousesApi({ page_size: 1000 }),
  });

  const locationsQuery = useQuery({
    queryKey: ["storage-locations", "profile-options"],
    queryFn: () => getStorageLocationsApi({ page_size: 1000 }),
  });

  const boxesQuery = useQuery({
    queryKey: ["storage-boxes", "profile-options"],
    queryFn: () => getStorageBoxesApi({ page_size: 1000 }),
  });

  const storageFilesQuery = useQuery({
    queryKey: ["storage-files", "profile-options"],
    queryFn: () => getStorageFilesApi({ page_size: 1000 }),
  });

  const {
    createMutation,
    updateMutation,
    deleteMutation,
  } = useProfileMutations();

  const digitalFileCountByProfile = useMemo(() => {
    const result: Record<string, number> = {};

    for (const file of digitalFilesQuery.data ?? []) {
      const profileId = file.profile_id ?? file.profile;

      if (!profileId) continue;

      const key = String(profileId);
      result[key] = (result[key] ?? 0) + 1;
    }

    return result;
  }, [digitalFilesQuery.data]);

  const isLoading =
    profilesQuery.isLoading ||
    digitalFilesQuery.isLoading ||
    fondsQuery.isLoading ||
    catalogsQuery.isLoading ||
    warehousesQuery.isLoading ||
    locationsQuery.isLoading ||
    boxesQuery.isLoading ||
    storageFilesQuery.isLoading;

  const isError =
    profilesQuery.isError ||
    digitalFilesQuery.isError ||
    fondsQuery.isError ||
    catalogsQuery.isError ||
    warehousesQuery.isError ||
    locationsQuery.isError ||
    boxesQuery.isError ||
    storageFilesQuery.isError;

  const firstError =
    profilesQuery.error ||
    digitalFilesQuery.error ||
    fondsQuery.error ||
    catalogsQuery.error ||
    warehousesQuery.error ||
    locationsQuery.error ||
    boxesQuery.error ||
    storageFilesQuery.error;

  const profiles = profilesQuery.data?.results ?? [];
  const total = profilesQuery.data?.pagination?.total ?? profiles.length;

  function handleOpenCreate() {
    setEditingProfile(null);
    setOpenForm(true);
  }

  function handleOpenEdit(profile: Profile) {
    setEditingProfile(profile);
    setOpenForm(true);
  }

  async function handleSubmitProfile(
    payload: ProfilePayload,
    profile?: Profile | null,
  ) {
    if (profile) {
      await updateMutation.mutateAsync({
        id: profile.id,
        payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }

    setOpenForm(false);
    setEditingProfile(null);
  }

  async function handleDeleteProfile(profile: Profile) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa hồ sơ "${profile.profile_code}" không?`,
    );

    if (!confirmed) return;

    await deleteMutation.mutateAsync(profile.id);
  }

  function handleRefresh() {
    profilesQuery.refetch();
    digitalFilesQuery.refetch();
    fondsQuery.refetch();
    catalogsQuery.refetch();
    warehousesQuery.refetch();
    locationsQuery.refetch();
    boxesQuery.refetch();
    storageFilesQuery.refetch();
  }

  if (isLoading) {
    return <ProfilesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">
            Quản lý hồ sơ
          </h2>

          <p className="text-sm text-muted-foreground">
            Tạo, sửa, xóa hồ sơ và chọn vị trí lưu: Kho → Kệ → Hộp → Tệp.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={profilesQuery.isFetching}
          >
            <RefreshCw className={profilesQuery.isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Tải lại
          </Button>

          <Button type="button" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm hồ sơ
          </Button>
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              firstError,
              "Không tải được dữ liệu hồ sơ.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {deleteMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              deleteMutation.error,
              "Không xóa được hồ sơ.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <ProfileImportCard />

      <OfflineProfilesCard
        catalogs={catalogsQuery.data ?? []}
        storageFiles={storageFilesQuery.data ?? []}
        profiles={profiles}
        isSyncing={createMutation.isPending}
        onSyncProfile={async (payload) => {
          await createMutation.mutateAsync(payload);
          await profilesQuery.refetch();
        }}
      />

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Danh sách hồ sơ</CardTitle>
          <Badge variant="secondary" className="w-fit">
            Tổng: {total}
          </Badge>
        </CardHeader>

        <CardContent>
          <ProfilesTable
            profiles={profiles}
            digitalFileCountByProfile={digitalFileCountByProfile}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteProfile}
            isDeleting={deleteMutation.isPending}
          />
        </CardContent>
      </Card>

      <ProfileFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editingProfile={editingProfile}
        isSaving={createMutation.isPending || updateMutation.isPending}
        error={createMutation.error || updateMutation.error}
        fonds={fondsQuery.data ?? []}
        catalogs={catalogsQuery.data ?? []}
        warehouses={warehousesQuery.data ?? []}
        locations={locationsQuery.data ?? []}
        boxes={boxesQuery.data ?? []}
        storageFiles={storageFilesQuery.data ?? []}
        onSubmit={handleSubmitProfile}
      />
    </div>
  );
}
