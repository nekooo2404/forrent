"use client";

import Link from "next/link";
import {
  CalendarClock,
  House,
  LoaderCircle,
  Lock,
  MapPin,
  UserRound,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import {
  authFetch,
  clearAuthSession,
  refreshStoredAuthSession,
} from "@/lib/auth-storage";
import {
  formatDate,
  formatVnd,
  type ApiUser,
  type MyViewingRequest,
} from "@/lib/api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

type ProfileFields = {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  otp: string;
};

function messageFrom(payload: ApiResponse<unknown>, fallback: string) {
  if (payload.errors && typeof payload.errors === "object") {
    const firstValue = Object.values(
      payload.errors as Record<string, unknown>,
    )[0];
    if (Array.isArray(firstValue) && firstValue[0])
      return String(firstValue[0]);
    if (firstValue) return String(firstValue);
  }
  return payload.message || fallback;
}

function emptyProfileFields(): ProfileFields {
  return { fullName: "", dateOfBirth: "", phone: "", email: "", otp: "" };
}

function timeSlotLabel(value: MyViewingRequest["preferred_viewing_time_slot"]) {
  return (
    {
      morning: "Buổi sáng",
      afternoon: "Buổi chiều",
      evening: "Buổi tối",
      "": "Chưa chọn khung giờ",
    }[value] ?? "Chưa chọn khung giờ"
  );
}
export function ProfileClient() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profileFields, setProfileFields] =
    useState<ProfileFields>(emptyProfileFields);
  const [viewingRequests, setViewingRequests] = useState<MyViewingRequest[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [profileState, setProfileState] = useState({ loading: false });
  const { toast } = useToast();

  useEffect(() => {
    async function loadProfile() {
      if (!(await refreshStoredAuthSession())) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authFetch("/api/auth/me");
        const payload = (await response.json()) as ApiResponse<ApiUser>;
        if (!response.ok || !payload.success || !payload.data) {
          clearAuthSession();
          setIsLoading(false);
          return;
        }

        setUser(payload.data);
        setProfileFields({
          fullName: payload.data.full_name,
          dateOfBirth: payload.data.date_of_birth ?? "",
          phone: payload.data.phone,
          email: payload.data.email,
          otp: "",
        });

        const requestsResponse = await authFetch("/api/viewing-requests/my");
        const requestsPayload = (await requestsResponse.json()) as ApiResponse<{
          results: MyViewingRequest[];
        }>;
        if (
          requestsResponse.ok &&
          requestsPayload.success &&
          requestsPayload.data?.results
        ) {
          setViewingRequests(requestsPayload.data.results);
        }
      } catch {
        toast({
          type: "error",
          title: "Không thể tải hồ sơ",
          message: "Không thể tải thông tin người dùng.",
        });
        setProfileState({ loading: false });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [toast]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await refreshStoredAuthSession())) return;

    setProfileState({ loading: true });
    try {
      const response = await authFetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: profileFields.fullName.trim(),
          date_of_birth: profileFields.dateOfBirth || null,
          phone: profileFields.phone.trim(),
          email: profileFields.email.trim(),
          otp: profileFields.otp.trim(),
        }),
      });
      const payload = (await response.json()) as ApiResponse<ApiUser>;
      if (!response.ok || !payload.success || !payload.data) {
        toast({
          type: "error",
          title: "Cập nhật thất bại",
          message: messageFrom(payload, "Không thể cập nhật thông tin."),
        });
        setProfileState({ loading: false });
        return;
      }

      setUser(payload.data);
      toast({
        type: "success",
        title: "Đã cập nhật hồ sơ",
        message: "Thông tin cá nhân đã được cập nhật.",
      });
      setProfileState({ loading: false });
    } catch {
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể kết nối hệ thống cập nhật.",
      });
      setProfileState({ loading: false });
    }
  }

  async function sendOtp(email: string) {
    const response = await authFetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), purpose: "CHANGE_EMAIL" }),
    });
    const payload = (await response.json()) as ApiResponse<
      Record<string, never>
    >;
    if (!response.ok || !payload.success) {
      throw new Error(messageFrom(payload, "Không thể gửi OTP."));
    }
  }

  async function handleSendProfileOtp() {
    setProfileState({ loading: true });
    try {
      await sendOtp(profileFields.email);
      toast({
        type: "success",
        title: "Đã gửi OTP",
        message: "Mã OTP đã được gửi tới email mới.",
      });
      setProfileState({ loading: false });
    } catch (error) {
      toast({
        type: "error",
        title: "Không thể gửi OTP",
        message: error instanceof Error ? error.message : "Không thể gửi OTP.",
      });
      setProfileState({ loading: false });
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1000px] px-margin-mobile py-24 md:px-margin-desktop">
        <div className="h-56 animate-pulse rounded-lg bg-surface-container" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-margin-mobile py-24 text-center md:px-margin-desktop">
        <div className="mx-auto mb-6 inline-flex size-16 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-lowest">
          <UserRound size={30} strokeWidth={1.8} />
        </div>
        <h1 className="mb-4 font-headline-md text-headline-md text-primary">
          Vui lòng đăng nhập
        </h1>
        <p className="mb-8 font-body-md text-body-md text-on-surface-variant">
          Bạn cần đăng nhập để xem và cập nhật thông tin tài khoản.
        </p>
        <Link
          className="inline-flex rounded bg-primary px-8 py-4 font-button text-button text-on-primary"
          href="/log-in"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const emailChanged =
    profileFields.email.trim().toLowerCase() !== user.email.toLowerCase();

  return (
    <div className="mx-auto max-w-[1000px] px-margin-mobile py-24 md:px-margin-desktop">
      <section className="mb-16 flex flex-col items-center gap-8 md:flex-row md:items-end">
        <div className="relative">
          <div className="flex size-40 items-center justify-center rounded-full border-4 border-surface-container-low bg-surface-container-lowest shadow-soft md:size-56">
            <UserRound size={84} strokeWidth={1.5} className="text-secondary" />
          </div>
        </div>
        <div className="flex-1 pb-4 text-center md:text-left">
          <span className="mb-2 block font-label-caps text-label-caps text-on-surface-variant">
            Tài khoản khách thuê
          </span>
          <h1 className="mb-2 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            {user.full_name}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant/70">
            Theo dõi lịch xem phòng, cập nhật liên hệ và nhận lại thông tin từ
            saler.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <section className="rounded-lg bg-surface-container-lowest p-8 shadow-soft md:p-12 lg:col-span-8">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              Cập nhật thông tin
            </h2>
            <Lock size={22} strokeWidth={1.8} className="text-outline" />
          </div>

          <form className="space-y-8" onSubmit={handleProfileSubmit}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <ProfileInput
                label="Họ và tên"
                required
                value={profileFields.fullName}
                onChange={(value) =>
                  setProfileFields((current) => ({
                    ...current,
                    fullName: value,
                  }))
                }
              />
              <ProfileInput
                label="Ngày sinh"
                type="date"
                value={profileFields.dateOfBirth}
                onChange={(value) =>
                  setProfileFields((current) => ({
                    ...current,
                    dateOfBirth: value,
                  }))
                }
              />
              <ProfileInput
                label="Số điện thoại"
                required
                type="tel"
                value={profileFields.phone}
                onChange={(value) =>
                  setProfileFields((current) => ({ ...current, phone: value }))
                }
              />
              <ProfileInput
                label="Địa chỉ email"
                required
                type="email"
                value={profileFields.email}
                onChange={(value) =>
                  setProfileFields((current) => ({ ...current, email: value }))
                }
              />
              <ProfileInput
                disabled={!emailChanged}
                helperText="Chỉ nhập OTP khi đổi sang email mới."
                label="Mã OTP khi đổi email"
                required={emailChanged}
                value={profileFields.otp}
                onChange={(value) =>
                  setProfileFields((current) => ({ ...current, otp: value }))
                }
              />
            </div>
            <button
              className="premium-button mr-3 inline-flex items-center justify-center gap-2 rounded border border-primary px-6 py-4 font-button text-button text-primary hover:bg-primary hover:text-on-primary disabled:cursor-wait disabled:opacity-70"
              disabled={profileState.loading || !emailChanged}
              onClick={handleSendProfileOtp}
              type="button"
            >
              Gửi OTP email
            </button>
            <button
              className="premium-button inline-flex items-center justify-center gap-2 rounded bg-primary px-10 py-4 font-button text-button text-on-primary hover:bg-secondary disabled:cursor-wait disabled:opacity-70"
              disabled={profileState.loading}
              type="submit"
            >
              {profileState.loading ? (
                <LoaderCircle
                  className="animate-spin"
                  size={18}
                  strokeWidth={1.8}
                />
              ) : null}
              Cập nhật thông tin
            </button>
          </form>
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-lg bg-primary p-8 text-on-primary shadow-soft">
            <span className="mb-6 block font-label-caps text-label-caps opacity-60">
              Thông tin tài khoản
            </span>
            <div className="space-y-4 text-sm">
              <p>
                <span className="opacity-60">Vai trò:</span> Người thuê
              </p>
              <p>
                <span className="opacity-60">Email:</span> {user.email}
              </p>
              <p>
                <span className="opacity-60">Điện thoại:</span> {user.phone}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-surface-container-lowest p-8 shadow-soft">
            <h3 className="mb-6 font-label-caps text-label-caps text-on-surface-variant">
              Hoạt động gần đây
            </h3>
            <div className="flex gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded bg-surface-container">
                <House size={22} strokeWidth={1.8} className="text-primary" />
              </div>
              <div>
                <p className="font-body-md leading-tight text-primary">
                  Yêu cầu xem phòng mới nhất
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Được đồng bộ qua tài khoản của bạn
                </p>
              </div>
            </div>
          </div>

          <ViewingRequestsSummary requests={viewingRequests} />
        </aside>
      </div>
    </div>
  );
}

function ViewingRequestsSummary({
  requests,
}: Readonly<{ requests: MyViewingRequest[] }>) {
  const recentRequests = requests.slice(0, 3);

  return (
    <div className="rounded-lg bg-surface-container-lowest p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant">
          Lịch xem phòng của bạn
        </h3>
        <CalendarClock size={20} strokeWidth={1.8} className="text-outline" />
      </div>

      {recentRequests.length ? (
        <div className="space-y-4">
          {recentRequests.map((request) => (
            <Link
              className="group block rounded-md border border-outline-variant/20 bg-surface-container-low/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft"
              href={`/rooms/${encodeURIComponent(request.room.slug)}`}
              key={request.id}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 font-body-md font-semibold text-primary">
                    {request.room.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
                    <MapPin size={13} strokeWidth={1.8} />
                    <span className="truncate">
                      {request.room.ward.name}, {request.room.city.name}
                    </span>
                  </p>
                </div>
                <StatusBadge status={request.status} type="lead" />
              </div>
              <div className="grid gap-2 border-t border-outline-variant/15 pt-3 text-xs text-on-surface-variant">
                <span>
                  {formatDate(
                    request.preferred_viewing_date || request.created_at,
                  )}{" "}
                  · {timeSlotLabel(request.preferred_viewing_time_slot)}
                </span>
                <span className="font-semibold text-primary">
                  {formatVnd(request.room.price, "VNĐ")}/tháng
                </span>
              </div>
            </Link>
          ))}

          <Link
            className="inline-flex items-center gap-2 font-button text-button text-primary transition hover:text-gold"
            href="/rooms"
          >
            Xem thêm phòng phù hợp
            <House size={16} strokeWidth={1.8} />
          </Link>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-outline-variant/30 bg-surface-container-low/60 p-5">
          <p className="font-body-md text-sm text-primary">
            Bạn chưa có yêu cầu xem phòng nào.
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Chọn phòng còn trống và đặt lịch, saler sẽ gọi lại để xác nhận giờ
            xem.
          </p>
          <Link
            className="premium-button mt-4 inline-flex rounded bg-primary px-4 py-2 font-button text-button text-on-primary"
            href="/rooms"
          >
            Tìm phòng để đặt lịch
          </Link>
        </div>
      )}
    </div>
  );
}

function ProfileInput({
  disabled = false,
  helperText,
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: Readonly<{
  disabled?: boolean;
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}>) {
  return (
    <label className="space-y-2">
      <span className="font-label-caps text-label-caps text-on-surface-variant">
        {label}
      </span>
      <input
        className="w-full border-0 border-b border-outline/20 bg-transparent px-0 py-3 font-body-md text-primary transition-colors disabled:cursor-not-allowed disabled:text-on-surface-variant/50 focus:border-primary focus:ring-0"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
      {helperText ? (
        <span className="block text-xs leading-5 text-on-surface-variant">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
