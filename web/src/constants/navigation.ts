import type { UserRole } from "@/types/auth";

export type NavigationGroup =
  | "overview"
  | "lookup"
  | "management"
  | "system";

export interface NavigationItem {
  title: string;
  href: string;
  description?: string;
  group: NavigationGroup;
  allowedRoles: UserRole[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "Tổng quan hệ thống lưu trữ",
    group: "overview",
    allowedRoles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"],
  },
  {
    title: "Tra cứu hồ sơ",
    href: "/tim-kiem",
    description: "Tìm kiếm hồ sơ, bản ghi, tài liệu và nội dung OCR",
    group: "lookup",
    allowedRoles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"],
  },
  {
    title: "Cây lưu trữ",
    href: "/cay-luu-tru",
    description: "Kho → Kệ / Vị trí → Hộp / Cặp → Tệp lưu trữ → Hồ sơ",
    group: "lookup",
    allowedRoles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"],
  },
  {
    title: "Hồ sơ",
    href: "/ho-so",
    description: "Quản lý hồ sơ lưu trữ",
    group: "management",
    allowedRoles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    title: "Danh mục nền",
    href: "/danh-muc",
    description: "Quản lý phông, mục lục, kho, hộp / cặp và tệp",
    group: "management",
    allowedRoles: ["ADMIN", "MANAGER"],
  },
  {
    title: "Nhật ký hệ thống",
    href: "/nhat-ky-he-thong",
    description: "Theo dõi thao tác người dùng",
    group: "system",
    allowedRoles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    title: "Báo cáo",
    href: "/bao-cao",
    description: "Dashboard, thống kê và export Excel/PDF",
    group: "system",
    allowedRoles: ["ADMIN", "MANAGER"],
  },
];

export const NAVIGATION_GROUP_LABELS: Record<NavigationGroup, string> = {
  overview: "Tổng quan",
  lookup: "Tra cứu",
  management: "Quản lý dữ liệu",
  system: "Hệ thống",
};

export const NAVIGATION_GROUP_ORDER: NavigationGroup[] = [
  "overview",
  "lookup",
  "management",
  "system",
];

export function getNavigationByRole(role?: UserRole | null): NavigationItem[] {
  if (!role) return [];

  return NAVIGATION_ITEMS.filter((item) =>
    item.allowedRoles.includes(role),
  );
}

export function getNavigationGroupsByRole(role?: UserRole | null) {
  const items = getNavigationByRole(role);

  return NAVIGATION_GROUP_ORDER.map((group) => ({
    group,
    label: NAVIGATION_GROUP_LABELS[group],
    items: items.filter((item) => item.group === group),
  })).filter((group) => group.items.length > 0);
}
