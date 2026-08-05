export type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";

export interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: UserRole;
  groups?: string[];
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  last_login?: string | null;
  date_joined?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh?: string;
  user?: CurrentUser;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}