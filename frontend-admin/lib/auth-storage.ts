import type { ApiUser, LoginResponse } from "@/lib/api";

export const accessTokenKey = "access";
export const refreshTokenKey = "refresh";
export const userStorageKey = "user";

export const legacyAccessTokenKeys = ["accessToken", "aurelian_access_token"];
export const legacyRefreshTokenKeys = ["refreshToken", "aurelian_refresh_token"];
export const legacyUserStorageKeys = ["currentUser", "aurelian_user"];

export const authTokenKeys = [accessTokenKey, ...legacyAccessTokenKeys];
export const authStorageKeys = [
  accessTokenKey,
  refreshTokenKey,
  userStorageKey,
  ...legacyAccessTokenKeys,
  ...legacyRefreshTokenKeys,
  ...legacyUserStorageKeys,
];

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return authTokenKeys.map((key) => window.localStorage.getItem(key)).find(Boolean) ?? null;
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return [refreshTokenKey, ...legacyRefreshTokenKeys].map((key) => window.localStorage.getItem(key)).find(Boolean) ?? null;
}

export function hasStoredAuthSession() {
  return Boolean(getStoredAccessToken());
}

export function saveAuthSession(session: LoginResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(accessTokenKey, session.access);
  window.localStorage.setItem(refreshTokenKey, session.refresh);
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
