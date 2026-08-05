import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="rounded-xl border bg-white px-6 py-4 text-sm text-gray-600 shadow-sm">
            Đang tải màn hình đăng nhập...
          </div>
        </main>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}