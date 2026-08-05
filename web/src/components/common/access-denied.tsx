import Link from "next/link";

import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

export function AccessDenied({
  title = "Không có quyền truy cập",
  message = "Bạn không có quyền xem nội dung này.",
}: AccessDeniedProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="max-w-md rounded-lg border bg-background p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">
          {title}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>

        <Button asChild className="mt-5">
          <Link href="/dashboard">
            Về Dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}