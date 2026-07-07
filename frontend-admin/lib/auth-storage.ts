import type { ApiUser, LoginResponse } from "@/lib/api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RefreshResponse = Record<string, never>;

const accessTokenKey = "access";
const refreshTokenKey = "refresh";
const userStorageKey = "user";

const legacyAccessTokenKeys = ["accessToken", "aurelian_access_token"];
const legacyRefreshTokenKeys = ["refreshToken", "aurelian_refresh_token"];
const legacyUserStorageKeys = ["currentUser", "aurelian_user"];

const sensitiveStorageKeys = [
  accessTokenKey,
  refreshTokenKey,
  ...legacyAccessTokenKeys,
  ...legacyRefreshTokenKeys,
];
const authStorageKeys = [
  accessTokenKey,
  refreshTokenKey,
  userStorageKey,
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
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(window.localStorage.getItem(userStorageKey));
}

export function saveAuthSession(session: LoginResponse) {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredTokens();
  window.localStorage.setItem(userStorageKey, JSON.stringify(session.user));
}

export function saveStoredUser(user: ApiUser) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(userStorageKey, JSON.stringify(user));
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
