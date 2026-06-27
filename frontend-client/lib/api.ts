import { cache } from "react";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
export const PUBLIC_REVALIDATE_SECONDS = 300;
export const STATIC_LOOKUP_REVALIDATE_SECONDS = 1800;
export const DETAIL_REVALIDATE_SECONDS = 600;
const DEFAULT_API_TIMEOUT_MS = 5000;

export const API_BASE_URL =
  process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiCity = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

export type ApiWard = {
  id: number;
  city: number;
  city_name: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export type ApiAmenity = {
  id: number;
  name: string;
  icon: string;
  is_active: boolean;
};

export type ApiAreaRange = {
  id: number;
  name: string;
  min_area: string;
  max_area: string | null;
  is_active: boolean;
};

export type ApiRoom = {
  id: number;
  title: string;
  slug: string;
  room_type: "CCMN" | "CCDV" | "HOUSE" | string;
  city: ApiCity;
  ward: ApiWard;
  address: string;
  price: string;
  actual_area: string;
  area_range: ApiAreaRange;
  amenities: ApiAmenity[];
  short_description: string;
  thumbnail: string | null;
  thumbnail_url: string | null;
  status: "AVAILABLE" | "UNAVAILABLE" | "HIDDEN" | string;
  created_at: string;
  updated_at: string;
};

export type ApiRoomImage = {
  id: number;
  image: string | null;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type ApiRoomDetail = ApiRoom & {
  description: string;
  images: ApiRoomImage[];
};

export type RoomFilters = {
  cities: ApiCity[];
  wards: ApiWard[];
  amenities: ApiAmenity[];
  area_ranges: ApiAreaRange[];
  room_types: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
};

export type ApiBlog = {
  id: number;
  title: string;
  slug: string;
  thumbnail: string | null;
  short_description: string;
  content: string;
  author_name: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactPayload = {
  full_name: string;
  phone: string;
  email?: string;
  message: string;
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
  access: string;
  refresh: string;
  user: ApiUser;
};

export type RegisterPayload = {
  full_name: string;
  date_of_birth?: string | null;
  phone: string;
  email: string;
  password: string;
  confirm_password: string;
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
  uid: number | string;
  token: string;
  new_password: string;
  confirm_new_password: string;
};

export type ViewingRequestResponse = {
  id: number;
  room_id: number;
  status: string;
  preferred_viewing_date: string | null;
  preferred_viewing_time_slot: "morning" | "afternoon" | "evening" | "";
  confirmed_at: string;
};

export type ViewingRequestPayload = {
  room_id: number;
  preferred_viewing_date?: string;
  preferred_viewing_time_slot?: "morning" | "afternoon" | "evening" | "";
};

export type MyViewingRequest = {
  id: number;
  room: ApiRoom;
  status: string;
  preferred_viewing_date: string | null;
  preferred_viewing_time_slot: "morning" | "afternoon" | "evening" | "";
  confirmed_at: string;
  created_at: string;
  updated_at: string;
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

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function apiFetch<T>(
  path: string,
  init: RequestInit & { next?: { revalidate?: number }; timeoutMs?: number } = {},
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, ...requestInit } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(buildUrl(path, params), {
    ...requestInit,
    headers: {
      Accept: "application/json",
      ...(requestInit.body ? { "Content-Type": "application/json" } : {}),
      ...requestInit.headers,
    },
    next: requestInit.next ?? (requestInit.method || requestInit.cache === "no-store" ? undefined : { revalidate: PUBLIC_REVALIDATE_SECONDS }),
    signal: requestInit.signal ?? controller.signal,
  }).finally(() => clearTimeout(timeout));

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || "Không thể kết nối backend.", response.status, payload?.errors);
  }

  return payload.data;
}

export async function getRooms(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  city?: number | string;
  ward?: number | string;
  room_type?: string;
  area_range?: number | string;
  status?: string;
  min_price?: number | string;
  max_price?: number | string;
}) {
  return apiFetch<Paginated<ApiRoom>>("/api/rooms/", { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } }, params);
}

export async function getRoomDetail(slug: string) {
  return apiFetch<ApiRoomDetail>(`/api/rooms/${encodeURIComponent(slug)}/`, { next: { revalidate: DETAIL_REVALIDATE_SECONDS } });
}

export async function getRoomFilters() {
  return apiFetch<RoomFilters>("/api/rooms/filters/", { next: { revalidate: STATIC_LOOKUP_REVALIDATE_SECONDS } });
}

export async function getBlogs(params?: { page?: number; page_size?: number; search?: string; ordering?: string }) {
  return apiFetch<Paginated<ApiBlog>>("/api/blogs/", { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } }, params);
}

export async function getBlogDetail(slug: string) {
  return apiFetch<ApiBlog>(`/api/blogs/${encodeURIComponent(slug)}/`, { next: { revalidate: DETAIL_REVALIDATE_SECONDS } });
}

export const getCachedBlogDetail = cache(getBlogDetail);
export const getCachedRoomDetail = cache(getRoomDetail);
export const getCachedRoomFilters = cache(getRoomFilters);

export async function submitContact(payload: ContactPayload) {
  return apiFetch<ContactPayload>("/api/contact/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerTenant(payload: RegisterPayload) {
  return apiFetch<ApiUser>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginTenant(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
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
    cache: "no-store",
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

export async function createViewingRequest(payload: ViewingRequestPayload, authorization?: string | null) {
  return apiFetch<ViewingRequestResponse>("/api/viewing-requests/", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : undefined,
    body: JSON.stringify(payload),
  });
}

export async function getMyViewingRequests(authorization?: string | null) {
  return apiFetch<Paginated<MyViewingRequest>>("/api/viewing-requests/my/", {
    cache: "no-store",
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

export function resolveMediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return new URL(value, API_BASE_URL).toString();
}

export function formatVnd(value: string | number, suffix = "VNĐ") {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return `${value} ${suffix}`;
  }
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(numeric)} ${suffix}`;
}

export function formatArea(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return `${value} m²`;
  }
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(numeric)} m²`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Chưa công bố";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function roomTypeLabel(value: string) {
  return (
    {
      CCMN: "Chung cư mini",
      CCDV: "Căn hộ dịch vụ",
      HOUSE: "Nhà nguyên căn",
    }[value] ?? value
  );
}

export function roomStatusLabel(value: string) {
  return (
    {
      AVAILABLE: "Trống",
      UNAVAILABLE: "Đã cho thuê",
      HIDDEN: "Đã ẩn",
    }[value] ?? value
  );
}
