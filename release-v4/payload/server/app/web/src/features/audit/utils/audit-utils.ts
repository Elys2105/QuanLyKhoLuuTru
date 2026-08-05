import type { AuditLog } from "@/features/audit/types";

export function getAuditUsername(log: AuditLog): string {
  return (
    log.username ||
    log.user_username ||
    log.created_by_username ||
    (log.user ? `User #${log.user}` : "") ||
    (log.user_id ? `User #${log.user_id}` : "") ||
    "-"
  );
}

export function getAuditAction(log: AuditLog): string {
  return log.action_display || log.action || "-";
}

export function getAuditModule(log: AuditLog): string {
  return (
    log.module ||
    log.app_label ||
    log.model ||
    log.object_type ||
    "-"
  );
}

export function getAuditObject(log: AuditLog): string {
  if (log.object_repr && log.object_id) {
    return `${log.object_repr} (#${log.object_id})`;
  }

  return (
    log.object_repr ||
    (log.object_id ? `#${log.object_id}` : "") ||
    "-"
  );
}

export function getAuditDescription(log: AuditLog): string {
  return (
    log.description ||
    log.message ||
    log.detail ||
    "-"
  );
}

export function getAuditTime(log: AuditLog): string {
  const value = log.created_at || log.timestamp || log.time;

  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function getAuditIp(log: AuditLog): string {
  return log.ip_address || "-";
}

export function getAuditMethodPath(log: AuditLog): string {
  if (log.method && log.path) {
    return `${log.method} ${log.path}`;
  }

  return log.path || log.method || "-";
}

export function getAuditActionBadgeVariant(
  action?: string,
): "default" | "secondary" | "outline" | "destructive" {
  const normalized = String(action || "").toLowerCase();

  if (
    normalized.includes("delete") ||
    normalized.includes("xoa") ||
    normalized.includes("xóa")
  ) {
    return "destructive";
  }

  if (
    normalized.includes("create") ||
    normalized.includes("add") ||
    normalized.includes("upload") ||
    normalized.includes("import")
  ) {
    return "default";
  }

  if (
    normalized.includes("update") ||
    normalized.includes("edit") ||
    normalized.includes("change")
  ) {
    return "secondary";
  }

  return "outline";
}

export function filterAuditLogsClientSide(
  logs: AuditLog[],
  filters: {
    q?: string;
    action?: string;
    user?: string;
    date_from?: string;
    date_to?: string;
  },
): AuditLog[] {
  const keyword = filters.q?.trim().toLowerCase() ?? "";
  const action = filters.action?.trim().toLowerCase() ?? "";
  const user = filters.user?.trim().toLowerCase() ?? "";
  const dateFrom = filters.date_from ? new Date(filters.date_from) : null;
  const dateTo = filters.date_to ? new Date(`${filters.date_to}T23:59:59`) : null;

  return logs.filter((log) => {
    const haystack = [
      getAuditUsername(log),
      getAuditAction(log),
      getAuditModule(log),
      getAuditObject(log),
      getAuditDescription(log),
      getAuditIp(log),
      getAuditMethodPath(log),
    ]
      .join(" ")
      .toLowerCase();

    if (keyword && !haystack.includes(keyword)) {
      return false;
    }

    if (
      action &&
      !String(log.action || log.action_display || "")
        .toLowerCase()
        .includes(action)
    ) {
      return false;
    }

    if (
      user &&
      !getAuditUsername(log)
        .toLowerCase()
        .includes(user)
    ) {
      return false;
    }

    const timeValue = log.created_at || log.timestamp || log.time;

    if ((dateFrom || dateTo) && timeValue) {
      const logDate = new Date(timeValue);

      if (!Number.isNaN(logDate.getTime())) {
        if (dateFrom && logDate < dateFrom) {
          return false;
        }

        if (dateTo && logDate > dateTo) {
          return false;
        }
      }
    }

    return true;
  });
}