"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  UserCircle,
} from "lucide-react";

import { NAVIGATION_ITEMS } from "@/constants/navigation";
import {
  getEffectiveUserRole,
  getRoleLabel,
} from "@/constants/roles";
import { useAuthStore } from "@/stores/auth-store";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

function getPageTitle(pathname: string): string {
  const matchedItem = NAVIGATION_ITEMS.find((item) => {
    if (item.href === "/dashboard") {
      return pathname === item.href;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  return matchedItem?.title ?? "Hệ thống";
}

function getUserDisplayName(username?: string | null, fullName?: string | null) {
  return fullName || username || "Người dùng";
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const role = getEffectiveUserRole(user);

  const pageTitle = useMemo(() => {
    return getPageTitle(pathname);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMobileSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Mở menu</span>
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {pageTitle}
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Hệ thống quản lý kho lưu trữ hồ sơ và tài liệu số hóa
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {getRoleLabel(role)}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <UserCircle className="h-5 w-5" />
              <span className="hidden max-w-36 truncate sm:inline">
                {getUserDisplayName(user?.username, user?.full_name)}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="space-y-1">
                <div className="truncate font-medium">
                  {getUserDisplayName(user?.username, user?.full_name)}
                </div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email || "Chưa có email"}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Vai trò: {getRoleLabel(role)}
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}