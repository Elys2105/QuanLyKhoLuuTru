"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthErrorAlert } from "@/features/auth/components/auth-error-alert";
import { loginSchema } from "@/features/auth/schemas";
import { useAuthStore } from "@/stores/auth-store";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getSafeNextUrl(nextUrl: string | null): string {
  if (!nextUrl) return "/dashboard";

  if (!nextUrl.startsWith("/")) {
    return "/dashboard";
  }

  if (nextUrl.startsWith("//")) {
    return "/dashboard";
  }

  if (nextUrl === "/login") {
    return "/dashboard";
  }

  return nextUrl;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    hydrateAuth,
    isHydrated,
    isAuthenticated,
    isLoading,
    error,
    login,
  } = useAuthStore();

  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("Admin@123456789");
  const [formError, setFormError] = useState<string | null>(null);

  const nextUrl = useMemo(() => {
    return getSafeNextUrl(searchParams.get("next"));
  }, [searchParams]);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace(nextUrl);
    }
  }, [isHydrated, isAuthenticated, nextUrl, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({
      username,
      password,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message;
      setFormError(firstError || "Dữ liệu đăng nhập không hợp lệ.");
      return;
    }

    try {
      await login(parsed.data);
      router.replace(nextUrl);
    } catch {
      // Lỗi đã được lưu trong auth store.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">
            Đăng nhập hệ thống
          </CardTitle>

          <CardDescription>
            Hệ thống quản lý kho lưu trữ hồ sơ, tài liệu và file số hóa.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <AuthErrorAlert message={formError || error} />

            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Nhập tên đăng nhập"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                disabled={isLoading}
              />
            </div>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <Alert>
              <AlertDescription>
                Tài khoản test hiện tại: Admin / Admin@123456789
              </AlertDescription>
            </Alert>

            {nextUrl !== "/dashboard" ? (
              <p className="text-center text-xs text-muted-foreground">
                Sau khi đăng nhập sẽ chuyển tới: {nextUrl}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}