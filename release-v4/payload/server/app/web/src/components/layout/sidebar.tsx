"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Database,
  FileArchive,
  FileSearch,
  FileText,
  FolderTree,
  Home,
  Import,
  LayoutDashboard,
  MapPinned,
  ScrollText,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  getNavigationGroupsByRole,
  type NavigationItem,
} from "@/constants/navigation";
import { getEffectiveUserRole } from "@/constants/roles";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const ICONS_BY_HREF: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/tim-kiem": Search,
  "/cay-luu-tru": FolderTree,
  "/ho-so": FileArchive,
  "/tai-lieu": FileText,
  "/phong": Building2,
  "/muc-luc": ClipboardList,
  "/kho": MapPinned,
  "/hop-cap": Boxes,
  "/nhap-lieu": Import,
  "/ocr": FileSearch,
  "/nhat-ky-he-thong": ShieldCheck,
  "/bao-cao": BarChart3,
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getItemIcon(item: NavigationItem): LucideIcon {
  return ICONS_BY_HREF[item.href] ?? Home;
}

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const role = getEffectiveUserRole(user);
  const groups = getNavigationGroupsByRole(role);

  return (
    <aside className="flex h-full w-full flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Database className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="truncate font-semibold">
            QuanLyKhoLuuTru
          </div>
          <div className="truncate text-xs text-muted-foreground">
            Quản lý kho lưu trữ
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = getItemIcon(item);
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}