import { authFetch } from "@/lib/auth-storage";

export type LandlordApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, unknown>;
};

export type LandlordPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type LandlordViewingRequest = {
  id: number;
  room: number;
  room_title: string;
  room_code: string;
  city_name: string;
  ward_name: string;
  full_name: string;
  phone: string;
  email: string;
  preferred_viewing_date: string | null;
  preferred_viewing_time_slot: string;
  status: "NEW" | "CONTACTED" | "SCHEDULED" | "VIEWED" | "CONVERTED" | "CANCELLED" | "NO_SHOW";
  appointment_confirmed_at: string | null;
  appointment_date: string | null;
  appointment_time_slot: string;
  created_at: string;
  updated_at: string;
};

export type LandlordCommission = {
  id: number;
  viewing_request: number;
  room_title: string;
  room_code: string;
  tenant_name: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  approved_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LandlordCommissionSummary = {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  cancelled: number;
  total_amount: string;
  pending_amount: string;
  approved_amount: string;
  paid_amount: string;
};

export type LandlordNotification = {
  id: number;
  type: "NEW_VIEWING_REQUEST";
  viewing_request: number;
  room_id: number;
  room_title: string;
  room_code: string;
  requester_name: string;
  preferred_viewing_date: string | null;
  preferred_viewing_time_slot: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type LandlordNotificationFeed = {
  unread_count: number;
  results: LandlordNotification[];
};

export function landlordErrorMessage(payload: LandlordApiResponse<unknown> | null, fallback: string) {
  if (payload?.errors && typeof payload.errors === "object") {
    const value = Object.values(payload.errors)[0];
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (value) return String(value);
  }
  return payload?.message || fallback;
}

export async function landlordRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await authFetch(`/api/landlord/${path.replace(/^\/+|\/+$/g, "")}`, {
    cache: "no-store",
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as LandlordApiResponse<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new Error(landlordErrorMessage(payload, "Không thể xử lý yêu cầu lúc này."));
  }
  return payload.data;
}

export function formatLandlordDate(value: string | null) {
  if (!value) return "Chưa xác nhận";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export function formatLandlordDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatLandlordVnd(value: string | number) {
  return `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} VNĐ`;
}

export const viewingStatusLabels: Record<LandlordViewingRequest["status"], string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  SCHEDULED: "Đã xếp lịch",
  VIEWED: "Đã xem phòng",
  CONVERTED: "Đã thuê",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
};

export const timeSlotLabels: Record<string, string> = {
  morning: "Sáng, 09:00 - 12:00",
  afternoon: "Chiều, 12:00 - 16:00",
  evening: "Tối, 16:00 - 19:00",
};
