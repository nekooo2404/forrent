import type { ApiUser, LoginResponse } from "@/lib/api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RefreshResponse = {
  access: string;
  refresh?: string;
};

export const accessTokenKey = "access";
export const refreshTokenKey = "refresh";
export const userStorageKey = "user";

export const legacyAccessTokenKeys = ["accessToken", "aurelian_access_token"];
export const legacyRefreshTokenKeys = ["refreshToken", "aurelian_refresh_token"];
export const legacyUserStorageKeys = ["currentUser", "aurelian_user"];

export const authTokenKeys = [accessTokenKey, ...legacyAccessTokenKeys];
const sensitiveStorageKeys = [
  accessTokenKey,
  refreshTokenKey,
  ...legacyAccessTokenKeys,
  ...legacyRefreshTokenKeys,
];
export const authStorageKeys = [
  accessTokenKey,
  refreshTokenKey,
  userStorageKey,
  ...legacyAccessTokenKeys,
  ...legacyRefreshTokenKeys,
  ...legacyUserStorageKeys,
];

let memoryAccessToken: string | null = null;

function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }
  sensitiveStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

export function getStoredAccessToken() {
  return memoryAccessToken;
}

export function getStoredRefreshToken() {
  return null;
}

export function hasStoredAuthSession() {
  if (getStoredAccessToken()) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(window.localStorage.getItem(userStorageKey));
}

export function saveAuthSession(session: LoginResponse) {
  if (typeof window === "undefined") {
    return;
  }

  memoryAccessToken = session.access;
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

  memoryAccessToken = null;
  authStorageKeys.forEach((key) => window.localStorage.removeItem(key));
}

export async function refreshStoredAuthSession() {
  const response = await fetch("/api/auth/refresh", {
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<RefreshResponse> | null;

  if (!response.ok || !payload?.success || !payload.data?.access) {
    clearAuthSession();
    return null;
  }

  memoryAccessToken = payload.data.access;
  clearStoredTokens();
  return payload.data.access;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  async function request(accessToken: string | null) {
    const headers = new Headers(init.headers);
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return fetch(input, { ...init, headers });
  }

  const firstResponse = await request(getStoredAccessToken());
  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  const refreshedAccess = await refreshStoredAuthSession();
  if (!refreshedAccess) {
    return firstResponse;
  }
  return request(refreshedAccess);
}
