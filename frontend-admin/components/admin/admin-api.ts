"use client";

import type { ApiAreaRange, ApiUser } from "@/lib/api";
import { authFetch } from "@/lib/auth-storage";

export type AdminEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

export type AdminPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type AdminCity = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminWard = {
  id: number;
  city: number;
  city_name: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminAmenity = {
  id: number;
  name: string;
  icon: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminAreaRange = ApiAreaRange & {
  created_at?: string;
  updated_at?: string;
};

export type AdminDepositType = {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminRoomImage = {
  id: number;
  image: string | null;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type AdminRoom = {
  id: number;
  title: string;
  slug: string;
  room_type: "CCMN" | "CCDV" | "HOUSE" | string;
  city: number;
  ward: number;
  address: string;
  price: string;
  deposit_type: number | null;
  deposit_type_name: string;
  deposit_amount: string;
  electricity_price_per_kwh: string;
  water_price_per_person: string;
  service_fee: string;
  actual_area: string;
  area_range: number;
  amenities: number[];
  short_description: string;
  description: string;
  thumbnail: string | null;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "RENTED" | "HIDDEN" | "ARCHIVED" | string;
  commission_percent: string;
  commission_base_amount: string;
  estimated_commission_amount: string;
  internal_note: string;
  created_by: number;
  created_by_name: string;
  images: AdminRoomImage[];
  created_at: string;
  updated_at: string;
};

export type AdminViewingRequest = {
  id: number;
  user_id: number;
  room: number;
  room_title: string;
  city_name: string;
  ward_name: string;
  full_name: string;
  date_of_birth: string | null;
  phone: string;
  email: string;
  preferred_viewing_date: string | null;
  preferred_viewing_time_slot: "morning" | "afternoon" | "evening" | "";
  assigned_to: number | null;
  assigned_to_name: string | null;
  next_follow_up_at: string | null;
  appointment_date: string | null;
  appointment_time_slot: "morning" | "afternoon" | "evening" | "";
  status: "NEW" | "CONTACTED" | "SCHEDULED" | "VIEWED" | "CONVERTED" | "NO_SHOW" | "CANCELLED" | string;
  saler_note: string;
  appointment_confirmed_at: string | null;
  moved_in_at: string | null;
  is_commission_counted: boolean;
  estimated_commission_amount: string;
  actual_commission_amount: string;
  created_at: string;
  updated_at: string;
};

export type AdminBlog = {
  id: number;
  title: string;
  slug: string;
  thumbnail: string | null;
  short_description: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | string;
  author: number;
  author_name: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminContactMessage = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  message: string;
  status: "NEW" | "READ" | "HANDLED" | string;
  room: number | null;
  room_title: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  admin_note: string;
  converted_viewing_request_id: number | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: number;
  full_name: string;
  date_of_birth: string | null;
  email: string;
  phone: string;
  role: "SALER" | "TENANT" | string;
  is_active: boolean;
  admin_updated_by: number | null;
  admin_updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardSummary = {
  total_rooms: number;
  active_rooms: number;
  total_viewing_requests: number;
  total_new_leads: number;
  total_moved_in_leads: number;
  total_estimated_commission: string | number;
  total_received_commission: string | number;
  status_counts: Record<string, number>;
  latest_leads: Array<{
    id: number;
    full_name: string;
    phone: string;
    room_id: number;
    room_title: string;
    status: string;
    created_at: string;
  }>;
};

export type CommissionSummary = {
  total_received_commission: string | number;
  total_estimated_commission: string | number;
  total_pending_payout: string | number;
  total_approved_payout: string | number;
  total_paid_payout: string | number;
  total_moved_in_leads: number;
  total_pending_leads: number;
  by_room: Array<{
    room_id: number;
    room__title: string;
    total_estimated_commission: string | number | null;
    total_received_commission: string | number | null;
    lead_count: number;
    moved_in_count: number;
  }>;
  by_month: Array<{
    month: string | null;
    total_estimated_commission: string | number | null;
    total_received_commission: string | number | null;
    lead_count: number;
  }>;
};

export type CommissionPayout = {
  id: number;
  viewing_request: number;
  room_title: string;
  tenant_name: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  paid_by: number | null;
  paid_by_name: string | null;
  paid_at: string | null;
  cancelled_by: number | null;
  cancelled_by_name: string | null;
  cancelled_at: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type AdminContextValue = {
  token: string;
  user: ApiUser;
  refreshUser: () => Promise<void>;
};

export class AdminApiError extends Error {
  status: number;
  errors: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function adminMessageFrom(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) {
    if (error.errors && typeof error.errors === "object") {
      const firstValue = Object.values(error.errors as Record<string, unknown>)[0];
      if (Array.isArray(firstValue) && firstValue[0]) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;
    }
    return error.message || fallback;
  }
  return fallback;
}

export async function adminRequest<T>(
  path: string,
  _token: string | null | undefined,
  init: RequestInit = {},
  params?: Record<string, string | number | undefined | null>,
): Promise<T> {
  const url = new URL(`/api/admin/${path.replace(/^\/+/, "")}`, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await authFetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as AdminEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new AdminApiError(payload?.message || "Không thể xử lý yêu cầu admin.", response.status, payload?.errors);
  }

  return payload.data as T;
}

export async function adminList<T>(
  path: string,
  token: string | null | undefined,
  params?: Record<string, string | number | undefined | null>,
) {
  return adminRequest<AdminPaginated<T>>(path, token, {}, params);
}

export function formatAdminDate(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function adminRoleLabel(role: string) {
  return role === "SALER" ? "Nhân viên tư vấn" : role === "TENANT" ? "Người thuê" : role;
}

export function formatAdminDateOnly(value?: string | null) {
  if (!value) return "Chưa chọn";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatAdminVnd(value?: string | number | null) {
  const numeric = Number(value ?? 0);
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number.isFinite(numeric) ? numeric : 0)} VNĐ`;
}

export function leadStatusLabel(status: string) {
  return (
    {
      NEW: "Yêu cầu mới",
      CONTACTED: "Đã liên hệ",
      SCHEDULED: "Đã lên lịch",
      VIEWED: "Đã xem phòng",
      CONVERTED: "Đã chốt thuê",
      NO_SHOW: "Không đến xem",
      CANCELLED: "Đã hủy",
    }[status] ?? status
  );
}

export function leadStatusTone(status: string) {
  if (status === "CONVERTED") return "bg-success-container text-success ring-success/20";
  if (status === "NEW") return "bg-warning-container text-on-warning-container ring-warning/30";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bg-error-container text-error ring-error/20";
  if (status === "SCHEDULED") return "bg-primary/10 text-primary ring-primary/10";
  if (status === "VIEWED") return "bg-primary/10 text-primary ring-primary/10";
  return "bg-surface-container-high text-secondary ring-outline-variant/30";
}

export function canManuallyTransitionLead(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;
  const allowed: Record<string, string[]> = {
    NEW: ["CONTACTED", "CANCELLED"],
    CONTACTED: ["CANCELLED"],
    SCHEDULED: ["VIEWED", "NO_SHOW", "CANCELLED"],
    VIEWED: ["CANCELLED"],
  };
  return allowed[currentStatus]?.includes(nextStatus) ?? false;
}

export function roomStatusTone(status: string) {
  if (status === "PUBLISHED") return "bg-success-container text-success ring-success/20";
  if (status === "RENTED") return "bg-warning-container text-on-warning-container ring-warning/30";
  if (status === "PENDING_REVIEW") return "bg-primary/10 text-primary ring-primary/10";
  return "bg-surface-container-high text-secondary ring-outline-variant/30";
}

export function canManuallyTransitionRoom(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;
  const allowed: Record<string, string[]> = {
    DRAFT: ["PENDING_REVIEW", "PUBLISHED", "HIDDEN", "ARCHIVED"],
    PENDING_REVIEW: ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"],
    PUBLISHED: ["HIDDEN", "ARCHIVED"],
    HIDDEN: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"],
    ARCHIVED: ["DRAFT"],
  };
  return allowed[currentStatus]?.includes(nextStatus) ?? false;
}

export function blogStatusLabel(status: string) {
  return (
    {
      DRAFT: "Bản nháp",
      PUBLISHED: "Đã xuất bản",
      HIDDEN: "Đã ẩn",
    }[status] ?? status
  );
}

export function blogStatusTone(status: string) {
  if (status === "PUBLISHED") return "bg-success-container text-success ring-success/20";
  if (status === "DRAFT") return "bg-warning-container text-on-warning-container ring-warning/30";
  return "bg-surface-container-high text-secondary ring-outline-variant/30";
}

export function contactStatusLabel(status: string) {
  return (
    {
      NEW: "Tin mới",
      READ: "Đã đọc",
      HANDLED: "Đã xử lý",
    }[status] ?? status
  );
}

export function contactStatusTone(status: string) {
  if (status === "HANDLED") return "bg-success-container text-success ring-success/20";
  if (status === "NEW") return "bg-warning-container text-on-warning-container ring-warning/30";
  return "bg-primary/10 text-primary ring-primary/10";
}

export function payoutStatusLabel(status: string) {
  return (
    {
      PENDING: "Chờ duyệt",
      APPROVED: "Đã duyệt",
      PAID: "Đã trả",
      CANCELLED: "Đã hủy",
    }[status] ?? status
  );
}

export function payoutStatusTone(status: string) {
  if (status === "PAID") return "bg-success-container text-success ring-success/20";
  if (status === "APPROVED") return "bg-primary/10 text-primary ring-primary/10";
  if (status === "CANCELLED") return "bg-error-container text-error ring-error/20";
  return "bg-warning-container text-on-warning-container ring-warning/30";
}
