"use client";

import { RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface SecurePdfFrameProps {
  title: string;
  objectUrl?: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  heightClassName?: string;
}

export function SecurePdfFrame({
  title,
  objectUrl,
  isLoading,
  errorMessage,
  heightClassName = "h-[720px]",
}: SecurePdfFrameProps) {
  if (isLoading) {
    return (
      <div className={heightClassName}>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Đang tải PDF...
          </div>
          <Skeleton className="h-[660px] w-full" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={heightClassName}>
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={`${heightClassName} flex items-center justify-center text-sm text-muted-foreground`}>
        Không có file PDF để hiển thị.
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={objectUrl}
      className={`${heightClassName} w-full bg-background`}
    />
  );
}