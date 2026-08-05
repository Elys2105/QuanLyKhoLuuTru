import Link from "next/link";

import type { DashboardLatestProfile } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils/format";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LatestProfilesCardProps {
  profiles: DashboardLatestProfile[];
}

export function LatestProfilesCard({
  profiles,
}: LatestProfilesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Hồ sơ mới nhất
        </CardTitle>
      </CardHeader>

      <CardContent>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có hồ sơ mới.
          </p>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/ho-so/${profile.id}`}
                className="block rounded-md border p-3 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-medium">
                      {profile.title}
                    </div>

                    <div className="truncate text-xs text-muted-foreground">
                      {profile.profile_code || profile.code || "Chưa có mã hồ sơ"}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(profile.created_at)}
                    </div>
                  </div>

                  {profile.year ? (
                    <Badge variant="secondary">
                      {profile.year}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}