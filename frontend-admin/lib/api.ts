const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL =
  process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

function buildRequestHeaders(initHeaders?: HeadersInit, hasBody = false) {
  const headers = new Headers(initHeaders);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (typeof window === "undefined") {
    headers.set("X-Forwarded-Proto", "https");
  }
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

export type ApiAreaRange = {
  id: number;
  name: string;
  min_area: string;
  max_area: string | null;
  is_active: boolean;
};

export type ApiUser = {
  id: number;
  full_name: string;
  date_of_birth: string | null;
  email: string;
  phone: string;
  role: string;
  avatar: string | null;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  access?: string;
  refresh?: string;
  user: ApiUser;
};

export type TokenRefreshResponse = {
  access: string;
  refresh?: string;
};

export type ProfileUpdatePayload = {
  full_name: string;
  date_of_birth?: string | null;
  phone: string;
  email: string;
};

export type ChangePasswordPayload = {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
};

export type PasswordResetRequestPayload = {
  email: string;
};

export type PasswordResetConfirmPayload = {
  email: string;
  otp: string;
  new_password: string;
  confirm_new_password: string;
};

export class ApiError extends Error {
  status: number;
  errors: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function buildUrl(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: buildRequestHeaders(init.headers, Boolean(init.body)),
    cache: init.method ? "no-store" : "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || "Không thể kết nối backend.", response.status, payload?.errors);
  }

  return payload.data;
}

export async function loginTenant(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshTenant(refresh: string) {
  return apiFetch<TokenRefreshResponse>("/api/auth/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
}

export async function logoutTenant(refresh: string, authorization?: string | null) {
  return apiFetch<Record<string, never>>("/api/auth/logout/", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : undefined,
    body: JSON.stringify({ refresh }),
  });
}

export async function getCurrentUser(authorization?: string | null) {
  return apiFetch<ApiUser>("/api/auth/me/", {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

export async function updateProfile(payload: ProfileUpdatePayload, authorization?: string | null) {
  return apiFetch<ApiUser>("/api/auth/profile/", {
    method: "PUT",
    headers: authorization ? { Authorization: authorization } : undefined,
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: ChangePasswordPayload, authorization?: string | null) {
  return apiFetch<Record<string, never>>("/api/auth/change-password/", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : undefined,
    body: JSON.stringify(payload),
  });
}

export async function requestPasswordReset(payload: PasswordResetRequestPayload) {
  return apiFetch<Record<string, never>>("/api/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload) {
  return apiFetch<Record<string, never>>("/api/auth/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
