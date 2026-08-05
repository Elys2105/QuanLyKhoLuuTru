"use client";

import Link from "next/link";
import { Edit, Eye, Trash2 } from "lucide-react";

import type { Profile } from "@/features/profiles/types";
import { joinTextParts } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProfilesTableProps {
  profiles: Profile[];
  digitalFileCountByProfile?: Record<string, number>;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  isDeleting?: boolean;
}

function getProfilePdfCount(
  profile: Profile,
  digitalFileCountByProfile?: Record<string, number>,
): number {
  const countFromDigitalFiles =
    digitalFileCountByProfile?.[String(profile.id)] ?? 0;

  const countFromProfile = profile.digital_file_count ?? 0;

  return Math.max(countFromDigitalFiles, countFromProfile);
}

function profileHasPdf(
  profile: Profile,
  digitalFileCountByProfile?: Record<string, number>,
): boolean {
  return (
    getProfilePdfCount(profile, digitalFileCountByProfile) > 0 ||
    Boolean(profile.has_pdf) ||
    Boolean(profile.pdf_preview_url) ||
    Boolean(profile.pdf_download_url)
  );
}

export function ProfilesTable({
  profiles,
  digitalFileCountByProfile,
  onEdit,
  onDelete,
  isDeleting,
}: ProfilesTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Chưa có hồ sơ.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Mã hồ sơ</th>
            <th className="px-3 py-2 text-left font-medium">Tên hồ sơ</th>
            <th className="px-3 py-2 text-left font-medium">Năm</th>
            <th className="px-3 py-2 text-left font-medium">Phông/Mục lục</th>
            <th className="px-3 py-2 text-left font-medium">Vị trí lưu</th>
            <th className="px-3 py-2 text-left font-medium">PDF</th>
            <th className="w-48 px-3 py-2 text-right font-medium">Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {profiles.map((profile) => {
            const locationText = joinTextParts([
              profile.warehouse_name,
              profile.location_name,
              profile.box_number ? `Hộp ${profile.box_number}` : null,
              profile.storage_file_number || profile.file_number
                ? `Tệp lưu trữ ${profile.storage_file_number || profile.file_number}`
                : null,
            ]);

            const pdfCount = getProfilePdfCount(
              profile,
              digitalFileCountByProfile,
            );

            const hasPdf = profileHasPdf(
              profile,
              digitalFileCountByProfile,
            );

            return (
              <tr key={profile.id} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/ho-so/${profile.id}`}
                    className="inline-flex"
                    data-profile-code-link
                  >
                    <Badge variant="secondary" className="hover:underline">
                      {profile.profile_code}
                    </Badge>
                  </Link>
                </td>

                <td className="px-3 py-2">
                  <Link
                    href={`/ho-so/${profile.id}`}
                    className="font-medium hover:underline"
                    data-profile-title-link
                  >
                    {profile.title}
                  </Link>
                  {profile.description ? (
                    <div className="line-clamp-1 text-xs text-muted-foreground">
                      {profile.description}
                    </div>
                  ) : null}
                </td>

                <td className="px-3 py-2">
                  {profile.year ?? "-"}
                </td>

                <td className="px-3 py-2">
                  <div>{profile.fond_name || "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {profile.catalog_name || "-"}
                  </div>
                </td>

                <td className="px-3 py-2">
                  {locationText}
                </td>

                <td className="px-3 py-2">
                  <Badge variant={hasPdf ? "default" : "outline"}>
                    {hasPdf ? `${pdfCount || 1} PDF` : "Chưa có PDF"}
                  </Badge>
                </td>

                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/ho-so/${profile.id}`}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Xem
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(profile)}
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Sửa
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={() => onDelete(profile)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}