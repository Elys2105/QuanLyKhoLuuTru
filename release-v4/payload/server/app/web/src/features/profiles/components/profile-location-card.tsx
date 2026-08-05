import type { Profile } from "@/features/profiles/types";
import { joinTextParts } from "@/lib/utils/format";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProfileLocationCardProps {
  profile: Profile;
}

export function ProfileLocationCard({
  profile,
}: ProfileLocationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vị trí lưu trữ</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Phông</div>
          <div>
            {joinTextParts([
              profile.fond_code,
              profile.fond_name,
            ])}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Mục lục</div>
          <div>
            {joinTextParts([
              profile.catalog_code,
              profile.catalog_name,
            ])}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Kho</div>
          <div>
            {joinTextParts([
              profile.warehouse_code,
              profile.warehouse_name,
            ])}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Kệ / Vị trí</div>
          <div>
            {joinTextParts([
              profile.location_code,
              profile.location_name,
            ])}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Hộp / Cặp</div>
          <div>
            {joinTextParts([
              profile.box_number,
              profile.box_title,
            ])}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Tệp</div>
          <div>
            {joinTextParts([
              profile.file_number || profile.storage_file_number,
              profile.storage_file_title,
            ])}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}