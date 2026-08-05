"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DocumentsManagerCard } from "@/features/documents/components/documents-manager-card";
import { useProfileDocuments } from "@/features/documents/hooks/use-profile-documents";
import { ProfileDetailSkeleton } from "@/features/profiles/components/profile-detail-skeleton";
import { ProfileInfoCard } from "@/features/profiles/components/profile-info-card";
import { ProfileLocationCard } from "@/features/profiles/components/profile-location-card";
import { useProfileDetail } from "@/features/profiles/hooks/use-profile-detail";
import { getApiErrorMessage } from "@/lib/api/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
export default function ProfileDetailPage() {
  const profileDetailUser = useAuthStore((state) => state.user) as {
    role?: unknown;
    is_superuser?: boolean;
  } | null;

  const profileDetailRole = String(profileDetailUser?.role ?? "").trim().toUpperCase();
  const isAdminProfileDetailUser = Boolean(
    profileDetailUser?.is_superuser || profileDetailRole === "ADMIN",
  );
  const isViewerProfileDetailUser = profileDetailRole === "VIEWER";
  const profileDetailBackHref = isViewerProfileDetailUser ? "/tim-kiem" : "/ho-so";
  const profileDetailBackText = isViewerProfileDetailUser ? "Quay lại tra cứu" : "Quay lại hồ sơ";
  const canMutateProfileDetail = isAdminProfileDetailUser;

  const params = useParams<{ id: string }>();

  const profileId = params.id;

  const profileQuery = useProfileDetail(profileId);
  const documentsQuery = useProfileDocuments(profileId);

  const isLoading = profileQuery.isLoading || documentsQuery.isLoading;
  const isError = profileQuery.isError || documentsQuery.isError;
  const firstError = profileQuery.error || documentsQuery.error;

  function refreshAfterRecordChanged() {
    profileQuery.refetch();
    documentsQuery.refetch();
  }

  if (isLoading) {
    return <ProfileDetailSkeleton />;
  }

  if (isError || !profileQuery.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href={profileDetailBackHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {profileDetailBackText}
          </Link>
        </Button>

        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(firstError, "Không tải được chi tiết hồ sơ.")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const profile = profileQuery.data;
  const records = documentsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-3">
            <Link href={profileDetailBackHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {profileDetailBackText}
            </Link>
          </Button>

          <h2 className="text-2xl font-semibold">
            Chi tiết hồ sơ
          </h2>

          <p className="text-sm text-muted-foreground">
            Thông tin hồ sơ và danh sách bản ghi thuộc hồ sơ.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProfileInfoCard profile={profile} />
        <ProfileLocationCard profile={profile} />
      </div>

      <DocumentsManagerCard
        title="Bản ghi"
        description="Danh sách văn bản/bản ghi thuộc hồ sơ này."
        documents={records}
        fixedProfileId={profile.id}
        onRefresh={() => documentsQuery.refetch()}
        onChanged={refreshAfterRecordChanged}
      />
    </div>
  );
}
