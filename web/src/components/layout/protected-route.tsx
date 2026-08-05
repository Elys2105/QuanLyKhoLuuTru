"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  getEffectiveUserRole,
  hasAnyRole,
} from "@/constants/roles";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ALL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "STAFF", "VIEWER"];
const EDIT_ROLES: UserRole[] = ["ADMIN", "MANAGER", "STAFF"];
const MANAGER_ROLES: UserRole[] = ["ADMIN", "MANAGER"];

type RouteAccessRule = {
  kind: "exact" | "prefix" | "pattern";
  value: string | RegExp;
  allowedRoles: UserRole[];
};

const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  { kind: "exact", value: "/dashboard", allowedRoles: ALL_ROLES },
  { kind: "exact", value: "/tim-kiem", allowedRoles: ALL_ROLES },
  { kind: "exact", value: "/cay-luu-tru", allowedRoles: ALL_ROLES },

  // Viewer chỉ được mở chi tiết hồ sơ và chi tiết bản ghi.
  { kind: "pattern", value: /^\/ho-so\/[^/]+$/, allowedRoles: ALL_ROLES },
  { kind: "pattern", value: /^\/tai-lieu\/[^/]+$/, allowedRoles: ALL_ROLES },

  // Trang quản lý/list chỉ dành cho nhóm được nhập/sửa.
  { kind: "exact", value: "/ho-so", allowedRoles: EDIT_ROLES },
  { kind: "exact", value: "/tai-lieu", allowedRoles: EDIT_ROLES },

  // Khu ghi dữ liệu.
  { kind: "prefix", value: "/nhap-lieu", allowedRoles: EDIT_ROLES },
  { kind: "prefix", value: "/nhat-ky-he-thong", allowedRoles: EDIT_ROLES },
  { kind: "prefix", value: "/nhat-ky", allowedRoles: EDIT_ROLES },
  { kind: "prefix", value: "/ocr", allowedRoles: EDIT_ROLES },

  // Khu quản trị.
  { kind: "prefix", value: "/bao-cao", allowedRoles: MANAGER_ROLES },
  { kind: "prefix", value: "/danh-muc", allowedRoles: MANAGER_ROLES },
  { kind: "prefix", value: "/phong", allowedRoles: MANAGER_ROLES },
  { kind: "prefix", value: "/muc-luc", allowedRoles: MANAGER_ROLES },
  { kind: "prefix", value: "/kho", allowedRoles: MANAGER_ROLES },
  { kind: "prefix", value: "/hop-cap", allowedRoles: MANAGER_ROLES },
];

function ruleMatches(rule: RouteAccessRule, pathname: string) {
  if (rule.kind === "exact") {
    return pathname === rule.value;
  }

  if (rule.kind === "prefix") {
    const prefix = String(rule.value);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }

  return (rule.value as RegExp).test(pathname);
}

function getAllowedRolesForPath(pathname: string): UserRole[] | null {
  const rule = ROUTE_ACCESS_RULES.find((item) => ruleMatches(item, pathname));
  return rule?.allowedRoles ?? null;
}

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tài khoản hiện tại không có quyền mở chức năng này.
        </p>
      </div>
    </div>
  );
}

function LoadingAuth() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Đang kiểm tra phiên đăng nhập...
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const authState = useAuthStore();
  const accessToken = authState.accessToken;
  const isAuthenticated = authState.isAuthenticated;
  const user = authState.user;

  const isLoggedIn = Boolean(isAuthenticated && accessToken);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return <LoadingAuth />;
  }

  const role = getEffectiveUserRole(user);
  const allowedRoles = getAllowedRolesForPath(pathname);

  if (allowedRoles && !hasAnyRole(role, allowedRoles)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
