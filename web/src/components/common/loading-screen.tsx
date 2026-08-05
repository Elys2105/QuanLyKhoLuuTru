interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Đang tải dữ liệu...",
}: LoadingScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="rounded-lg border bg-background px-6 py-5 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </main>
  );
}