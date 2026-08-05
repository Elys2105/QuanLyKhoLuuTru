import Link from "next/link";
import {
  Box,
  Boxes,
  Building2,
  Database,
  FileArchive,
  FolderOpen,
  MapPinned,
} from "lucide-react";

import type {
  ArchiveTreeBox,
  ArchiveTreeLocation,
  ArchiveTreeProfile,
  ArchiveTreeStorageFile,
  ArchiveTreeWarehouse,
} from "@/features/archive-tree/types";
import { ArchiveTreeNode } from "@/features/archive-tree/components/archive-tree-node";
import { ArchiveTreePdfList } from "@/features/archive-tree/components/archive-tree-pdf-list";
import {
  getBoxStorageFiles,
  getBoxTitle,
  getLocationBoxes,
  getProfileDigitalFiles,
  getStorageFileNumber,
  getStorageFileProfiles,
  getStorageFileTitle,
  getWarehouseLocations,
  profileHasPdf,
} from "@/features/archive-tree/utils/archive-tree-utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ArchiveTreeViewProps {
  warehouses: ArchiveTreeWarehouse[];
}

function renderProfile(profile: ArchiveTreeProfile, level: number) {
  const pdfFiles = getProfileDigitalFiles(profile);
  const hasPdf = profileHasPdf(profile);

  return (
    <ArchiveTreeNode
      key={profile.id}
      level={level}
      icon={<FileArchive className="h-4 w-4" />}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>{profile.profile_code}</span>
          {profile.year ? (
            <Badge variant="outline">
              {profile.year}
            </Badge>
          ) : null}
          <Badge variant={hasPdf ? "default" : "outline"}>
            {hasPdf ? "Có PDF" : "Chưa có PDF"}
          </Badge>
        </div>
      }
      subtitle={
        <div className="space-y-2">
          <div>{profile.title}</div>

          <Button asChild size="sm" variant="outline">
            <Link href={`/ho-so/${profile.id}`}>
              Xem chi tiết hồ sơ
            </Link>
          </Button>
        </div>
      }
    >
      <ArchiveTreePdfList files={pdfFiles} />
    </ArchiveTreeNode>
  );
}

function renderStorageFile(
  storageFile: ArchiveTreeStorageFile,
  level: number,
) {
  const profiles = getStorageFileProfiles(storageFile);

  return (
    <ArchiveTreeNode
      key={storageFile.id}
      level={level}
      icon={<Database className="h-4 w-4" />}
      title={`Tệp ${getStorageFileNumber(storageFile)}`}
      subtitle={getStorageFileTitle(storageFile)}
      badge={`${profiles.length} hồ sơ`}
    >
      {profiles.length === 0 ? (
        <div className="ml-12 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Tệp này chưa có hồ sơ.
        </div>
      ) : (
        profiles.map((profile) => renderProfile(profile, level + 1))
      )}
    </ArchiveTreeNode>
  );
}

function renderBox(box: ArchiveTreeBox, level: number) {
  const storageFiles = getBoxStorageFiles(box);

  return (
    <ArchiveTreeNode
      key={box.id}
      level={level}
      icon={<Boxes className="h-4 w-4" />}
      title={`Hộp/Cặp ${box.box_number}`}
      subtitle={getBoxTitle(box)}
      badge={`${storageFiles.length} tệp`}
    >
      {storageFiles.length === 0 ? (
        <div className="ml-12 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Hộp này chưa có tệp.
        </div>
      ) : (
        storageFiles.map((storageFile) =>
          renderStorageFile(storageFile, level + 1),
        )
      )}
    </ArchiveTreeNode>
  );
}

function renderLocation(location: ArchiveTreeLocation, level: number) {
  const boxes = getLocationBoxes(location);

  return (
    <ArchiveTreeNode
      key={location.id}
      level={level}
      icon={<MapPinned className="h-4 w-4" />}
      title={`${location.code} - ${location.name}`}
      subtitle="Vị trí/Kệ lưu trữ"
      badge={`${boxes.length} hộp`}
    >
      {boxes.length === 0 ? (
        <div className="ml-12 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Vị trí này chưa có hộp/cặp.
        </div>
      ) : (
        boxes.map((box) => renderBox(box, level + 1))
      )}
    </ArchiveTreeNode>
  );
}

function renderWarehouse(warehouse: ArchiveTreeWarehouse) {
  const locations = getWarehouseLocations(warehouse);

  return (
    <ArchiveTreeNode
      key={warehouse.id}
      defaultOpen
      level={0}
      icon={<Building2 className="h-4 w-4" />}
      title={`${warehouse.code} - ${warehouse.name}`}
      subtitle="Kho lưu trữ"
      badge={`${locations.length} vị trí`}
    >
      {locations.length === 0 ? (
        <div className="ml-12 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Kho này chưa có vị trí/kệ.
        </div>
      ) : (
        locations.map((location) => renderLocation(location, 1))
      )}
    </ArchiveTreeNode>
  );
}

export function ArchiveTreeView({
  warehouses,
}: ArchiveTreeViewProps) {
  if (warehouses.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 font-medium">
          Chưa có dữ liệu cây lưu trữ
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Khi có kho, vị trí, hộp, tệp và hồ sơ thì cây sẽ hiển thị tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {warehouses.map((warehouse) => renderWarehouse(warehouse))}
    </div>
  );
}