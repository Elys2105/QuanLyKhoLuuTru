import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthErrorAlertProps {
  message?: string | null;
}

export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}