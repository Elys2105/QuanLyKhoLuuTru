import type { Profile } from "@/features/profiles/types";
import { fallbackText, formatDate } from "@/lib/utils/format";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProfileInfoCardProps {
  profile: Profile;
}

function display(value: unknown) {
  return fallbackText(value as string | number | null | undefined);
}

function DetailRow({
  label,
  value,
  wide,
}: {
  label: string;
  value: unknown;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "space-y-1 md:col-span-2" : "space-y-1"}>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium">
        {display(value)}
      </div>
    </div>
  );
}

export function ProfileInfoCard({ profile }: ProfileInfoCardProps) {
  const retention =
    profile.retention_period_display || profile.retention_period || "";

  const note = profile.notes || profile.note || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin hồ sơ</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {profile.profile_code}
          </Badge>

          {profile.profile_type ? (
            <Badge variant="outline">
              {profile.profile_type}
            </Badge>
          ) : null}

          {profile.year ? (
            <Badge variant="outline">
              Năm {profile.year}
            </Badge>
          ) : null}

          {retention ? (
            <Badge variant="outline">
              {retention}
            </Badge>
          ) : null}
        </div>

        <div>
          <h2 className="text-xl font-semibold">
            {profile.title}
          </h2>

          {profile.description ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {profile.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <DetailRow label="Loại hồ sơ" value={profile.profile_type} />
          <DetailRow label="Mã hồ sơ" value={profile.profile_code} />

          <DetailRow label="Phông" value={
            profile.fond_code || profile.fond_name
              ? `${display(profile.fond_code)} - ${display(profile.fond_name)}`
              : ""
          } />

          <DetailRow label="Mục lục số" value={
            profile.catalog_code || profile.catalog_name
              ? `${display(profile.catalog_code)} - ${display(profile.catalog_name)}`
              : ""
          } />

          <DetailRow
            label="Đơn vị bảo quản số"
            value={profile.preservation_unit_number}
          />

          <DetailRow
            label="Số và ký hiệu hồ sơ"
            value={profile.file_notation}
          />

          <DetailRow
            label="Thời gian bắt đầu"
            value={formatDate(profile.start_date)}
          />

          <DetailRow
            label="Thời gian kết thúc"
            value={formatDate(profile.end_date)}
          />

          <DetailRow
            label="Mã cơ quan lưu trữ lịch sử"
            value={profile.historical_archive_code}
          />

          <DetailRow
            label="Thời hạn bảo quản"
            value={retention}
          />

          <DetailRow
            label="Tổng số tài liệu trong hồ sơ"
            value={profile.total_documents}
          />

          <DetailRow
            label="Tổng số trang trong hồ sơ"
            value={profile.total_pages}
          />

          <DetailRow
            label="Tên nhóm hồ sơ"
            value={profile.profile_group_name}
          />

          <DetailRow
            label="Tình trạng vật lý"
            value={profile.physical_condition}
          />

          <DetailRow
            label="Từ khóa"
            value={profile.keywords}
            wide
          />

          <DetailRow
            label="Chuyên đề"
            value={profile.topic}
          />

          <DetailRow
            label="Ngôn ngữ"
            value={profile.language}
          />

          <DetailRow
            label="Cấp số hoặc kho, giá, cặp số"
            value={profile.storage_position_text}
            wide
          />

          <DetailRow
            label="Chú thích"
            value={note}
            wide
          />
        </div>
      </CardContent>
    </Card>
  );
}