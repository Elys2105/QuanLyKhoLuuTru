import type { CurrentUser, UserRole } from "@/types/auth";

export const USER_ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  VIEWER: "VIEWER",
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
  VIEWER: "Người xem",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: "Toàn quyền hệ thống",
  MANAGER: "Quản lý nghiệp vụ, báo cáo, import/export",
  STAFF: "Nhập liệu, chỉnh sửa hồ sơ, upload file số hóa",
  VIEWER: "Chỉ xem và tra cứu dữ liệu",
};

export const ROLE_PRIORITY: Record<UserRole, number> = {
  ADMIN: 4,
  MANAGER: 3,
  STAFF: 2,
  VIEWER: 1,
};

export const ROLE_VALUES = Object.values(USER_ROLES) as UserRole[];

const ROLE_VALUE_SET = new Set<string>(ROLE_VALUES);

export function normalizeUserRole(value?: string | null): UserRole | null {
  const normalized = String(value || "").trim().toUpperCase();

  if (ROLE_VALUE_SET.has(normalized)) {
    return normalized as UserRole;
  }

  return null;
}

export function getUserGroupRoles(user?: CurrentUser | null): UserRole[] {
  if (!user?.groups || !Array.isArray(user.groups)) {
    return [];
  }

  const roles: UserRole[] = [];

  for (const group of user.groups) {
    const role = normalizeUserRole(group);

    if (role && !roles.includes(role)) {
      roles.push(role);
    }
  }

  return roles.sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a]);
}

export function getEffectiveUserRole(
  user?: CurrentUser | null,
): UserRole | null {
  if (!user) return null;

  const explicitRole = normalizeUserRole(user.role);

  if (explicitRole) {
    return explicitRole;
  }

  if (user.is_superuser) {
    return "ADMIN";
  }

  const groupRoles = getUserGroupRoles(user);

  if (groupRoles.length > 0) {
    return groupRoles[0];
  }

  if (user.is_staff) {
    return "MANAGER";
  }

  return "VIEWER";
}

export function getRoleLabel(role?: UserRole | null): string {
  if (!role) return "Chưa xác định";
  return ROLE_LABELS[role] ?? role;
}

export function hasAnyRole(
  currentRole: UserRole | undefined | null,
  allowedRoles: UserRole[],
): boolean {
  if (!currentRole) return false;
  return allowedRoles.includes(currentRole);
}

export function canEditArchive(role?: UserRole | null): boolean {
  return hasAnyRole(role, ["ADMIN", "MANAGER", "STAFF"]);
}

export function canDeleteArchive(role?: UserRole | null): boolean {
  return hasAnyRole(role, ["ADMIN", "MANAGER"]);
}

export function canManageSystem(role?: UserRole | null): boolean {
  return hasAnyRole(role, ["ADMIN", "MANAGER"]);
}

export function canViewAuditLog(role?: UserRole | null): boolean {
  return hasAnyRole(role, ["ADMIN", "MANAGER", "STAFF"]);
}

export function canExportReport(role?: UserRole | null): boolean {
  return hasAnyRole(role, ["ADMIN", "MANAGER"]);
}


export const VIEWER_READONLY_ROUTE_PREFIXES = [
  "/dashboard",
  "/tim-kiem",
  "/cay-luu-tru",
  "/ho-so",
  "/tai-lieu",
  "/ocr",
];

export const VIEWER_READONLY_ROLES = [
  "admin",
  "manager",
  "archivist",
  "staff",
  "editor",
  "viewer",
  "user",
  "user_test",
  "guest",
];

export function normalizeRoleName(role: unknown) {
  return String(role ?? "").trim().toLowerCase();
}

export function isViewerReadonlyRole(role: unknown) {
  const normalized = normalizeRoleName(role);
  return VIEWER_READONLY_ROLES.includes(normalized);
}

export function isViewerReadonlyRoute(pathname: string) {
  return VIEWER_READONLY_ROUTE_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
