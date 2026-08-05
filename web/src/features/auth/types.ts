import type {
  ChangePasswordRequest,
  CurrentUser,
  LoginRequest,
  LoginResponse,
} from "@/types/auth";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

export interface AuthStoreState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  isHydrated: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;

  error: string | null;

  hydrateAuth: () => void;
  login: (payload: LoginRequest) => Promise<CurrentUser | null>;
  fetchCurrentUser: () => Promise<CurrentUser>;
  logout: () => Promise<void>;
  clearAuth: () => void;
  setUser: (user: CurrentUser | null) => void;
}

export type BackendLoginResponse = LoginResponse;

export type BackendCurrentUserResponse = CurrentUser;

export type BackendChangePasswordRequest = ChangePasswordRequest;