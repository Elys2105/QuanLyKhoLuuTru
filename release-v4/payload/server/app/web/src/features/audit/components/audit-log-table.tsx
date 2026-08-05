"use client";

import type { AuditLog } from "@/features/audit/types";
import {
  getAuditAction,
  getAuditActionBadgeVariant,
  getAuditDescription,
  getAuditIp,
  getAuditMethodPath,
  getAuditModule,
  getAuditObject,
  getAuditTime,
  getAuditUsername,
} from "@/features/audit/utils/audit-utils";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

export function AuditLogTable({
  logs,
  isLoading,
}: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        Chưa có nhật ký hệ thống phù hợp.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1200px] text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Thời gian</th>
            <th className="px-3 py-2 text-left font-medium">User</th>
            <th className="px-3 py-2 text-left font-medium">Hành động</th>
            <th className="px-3 py-2 text-left font-medium">Module</th>
            <th className="px-3 py-2 text-left font-medium">Đối tượng</th>
            <th className="px-3 py-2 text-left font-medium">Mô tả</th>
            <th className="px-3 py-2 text-left font-medium">IP</th>
            <th className="px-3 py-2 text-left font-medium">Request</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t align-top">
              <td className="whitespace-nowrap px-3 py-2">
                {getAuditTime(log)}
              </td>

              <td className="px-3 py-2">
                {getAuditUsername(log)}
              </td>

              <td className="px-3 py-2">
                <Badge variant={getAuditActionBadgeVariant(log.action)}>
                  {getAuditAction(log)}
                </Badge>
              </td>

              <td className="px-3 py-2">
                {getAuditModule(log)}
              </td>

              <td className="px-3 py-2">
                {getAuditObject(log)}
              </td>

              <td className="max-w-[360px] px-3 py-2">
                <div className="line-clamp-3">
                  {getAuditDescription(log)}
                </div>
              </td>

              <td className="whitespace-nowrap px-3 py-2">
                {getAuditIp(log)}
              </td>

              <td className="max-w-[260px] px-3 py-2">
                <code className="text-xs">
                  {getAuditMethodPath(log)}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}