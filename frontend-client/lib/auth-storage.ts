import type { ApiUser } from "@/lib/api";

export type BrowserAuthSession = {
  user: ApiUser;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RefreshResponse = Record<string, never>;
export type AuthSessionDetails = {
  authenticated: boolean;
  role: ApiUser["role"] | null;
};

type SessionResponse = {
  authenticated: boolean;
  role?: ApiUser["role"] | null;
};

const accessTokenKey = "access";
const refreshTokenKey = "refresh";

const legacyAccessTokenKeys = ["accessToken", "aurelian_access_token"];
const legacyRefreshTokenKeys = ["refreshToken", "aurelian_refresh_token"];
const legacyUserStorageKeys = ["user", "currentUser", "aurelian_user"];

const sensitiveStorageKeys = [
  accessTokenKey,
  refreshTokenKey,
  ...legacyAccessTokenKeys,
  ...legacyRefreshTokenKeys,
];
const authStorageKeys = [
  accessTokenKey,
  refreshTokenKey,
  ...legacyAccessTokenKeys,
  ...legacyRefreshTokenKeys,
  ...legacyUserStorageKeys,
];

function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }
  sensitiveStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

export function hasStoredAuthSession() {
  return false;
}

export function saveAuthSession(_session: BrowserAuthSession) {
  void _session;

  if (typeof window === "undefined") {
    return;
  }

  authStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

export function saveStoredUser(_user: ApiUser) {
  void _user;

  if (typeof window === "undefined") {
    return;
  }

  authStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  authStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

export async function refreshStoredAuthSession() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<RefreshResponse> | null;

  if (!response.ok || !payload?.success) {
    clearAuthSession();
    return null;
  }

  clearStoredTokens();
  return "cookie-session";
}

export async function getAuthSessionDetails(): Promise<AuthSessionDetails> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as ApiResponse<SessionResponse> | null;
  const authenticated = Boolean(response.ok && payload?.success && payload.data?.authenticated);
  return {
    authenticated,
    role: authenticated ? payload?.data?.role ?? null : null,
  };
}

export async function getAuthSession() {
  const session = await getAuthSessionDetails();
  return session.authenticated;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  async function request() {
    return fetch(input, init);
  }

  const firstResponse = await request();
  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  const refreshedAccess = await refreshStoredAuthSession();
  if (!refreshedAccess) {
    return firstResponse;
  }
  return request();
}
