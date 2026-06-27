"use client";

import Link from "next/link";
import { AlertCircle, CalendarClock, CheckCircle, House, KeyRound, LoaderCircle, Lock, MapPin, Medal, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { clearAuthSession, getStoredAccessToken, saveStoredUser } from "@/lib/auth-storage";
import { formatDate, formatVnd, type ApiUser, type MyViewingRequest } from "@/lib/api";

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
};

type ChangePasswordFields = {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

function messageFrom(payload: ApiResponse<unknown>, fallback: string) {
  if (payload.errors && typeof payload.errors === "object") {
    const firstValue = Object.values(payload.errors as Record<string, unknown>)[0];
    if (Array.isArray(firstValue) && firstValue[0]) return String(firstValue[0]);
    if (firstValue) return String(firstValue);
  }
  return payload.message || fallback;
}

function emptyProfileFields(): ProfileFields {
  return { fullName: "", dateOfBirth: "", phone: "", email: "" };
}

function viewingStatusLabel(status: string) {
  return (
    {
      NEW: "Mới gửi",
      CONTACTED: "Đã liên hệ",
      VIEWED: "Đã xem phòng",
      MOVED_IN: "Đã chuyển vào",
      NOT_MOVED_IN: "Không chuyển vào",
      CANCELLED: "Đã hủy",
    }[status] ?? status
  );
}

function viewingStatusClass(status: string) {
  if (status === "MOVED_IN") return "border-[#315f45]/20 bg-[#315f45]/10 text-[#315f45]";
  if (status === "NEW") return "border-[#D4AF37]/25 bg-[#D4AF37]/15 text-[#7a5c00]";
  if (status === "CANCELLED" || status === "NOT_MOVED_IN") return "border-error/20 bg-error-container/40 text-error";
  return "border-outline-variant/25 bg-surface-container text-primary";
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
  const [profileFields, setProfileFields] = useState<ProfileFields>(emptyProfileFields);
  const [passwordFields, setPasswordFields] = useState<ChangePasswordFields>({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [viewingRequests, setViewingRequests] = useState<MyViewingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileState, setProfileState] = useState({ loading: false, message: "", error: "" });
  const [passwordState, setPasswordState] = useState({ loading: false, message: "", error: "" });
  const [resetState, setResetState] = useState({ loading: false, message: "", error: "" });

  useEffect(() => {
    async function loadProfile() {
      const accessToken = getStoredAccessToken();
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
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
        });
        setResetEmail(payload.data.email);

        const requestsResponse = await fetch("/api/viewing-requests/my", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const requestsPayload = (await requestsResponse.json()) as ApiResponse<{ results: MyViewingRequest[] }>;
        if (requestsResponse.ok && requestsPayload.success && requestsPayload.data?.results) {
          setViewingRequests(requestsPayload.data.results);
        }
      } catch {
        setProfileState({ loading: false, message: "", error: "Không thể tải thông tin người dùng." });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessToken = getStoredAccessToken();
    if (!accessToken) return;

    setProfileState({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          full_name: profileFields.fullName.trim(),
          date_of_birth: profileFields.dateOfBirth || null,
          phone: profileFields.phone.trim(),
          email: profileFields.email.trim(),
        }),
      });
      const payload = (await response.json()) as ApiResponse<ApiUser>;
      if (!response.ok || !payload.success || !payload.data) {
        setProfileState({ loading: false, message: "", error: messageFrom(payload, "Không thể cập nhật thông tin.") });
        return;
      }

      setUser(payload.data);
      saveStoredUser(payload.data);
      setProfileState({ loading: false, message: "Thông tin cá nhân đã được cập nhật.", error: "" });
    } catch {
      setProfileState({ loading: false, message: "", error: "Không thể kết nối hệ thống cập nhật." });
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessToken = getStoredAccessToken();
    if (!accessToken) return;

    if (passwordFields.newPassword !== passwordFields.confirmNewPassword) {
      setPasswordState({ loading: false, message: "", error: "Mật khẩu xác nhận không khớp." });
      return;
    }

    setPasswordState({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          old_password: passwordFields.oldPassword,
          new_password: passwordFields.newPassword,
          confirm_new_password: passwordFields.confirmNewPassword,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Record<string, never>>;
      if (!response.ok || !payload.success) {
        setPasswordState({ loading: false, message: "", error: messageFrom(payload, "Không thể đổi mật khẩu.") });
        return;
      }

      setPasswordFields({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
      setPasswordState({ loading: false, message: "Mật khẩu đã được đổi thành công.", error: "" });
    } catch {
      setPasswordState({ loading: false, message: "", error: "Không thể kết nối hệ thống đổi mật khẩu." });
    }
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetState({ loading: true, message: "", error: "" });

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const payload = (await response.json()) as ApiResponse<Record<string, never>>;
      if (!response.ok || !payload.success) {
        setResetState({ loading: false, message: "", error: messageFrom(payload, "Không thể gửi email đặt lại mật khẩu.") });
        return;
      }

      setResetState({ loading: false, message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.", error: "" });
    } catch {
      setResetState({ loading: false, message: "", error: "Không thể kết nối hệ thống quên mật khẩu." });
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
        <h1 className="mb-4 font-headline-md text-headline-md text-primary">Vui lòng đăng nhập</h1>
        <p className="mb-8 font-body-md text-body-md text-on-surface-variant">
          Bạn cần đăng nhập để xem và cập nhật thông tin tài khoản.
        </p>
        <Link className="inline-flex rounded bg-primary px-8 py-4 font-button text-button text-on-primary" href="/log-in">
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-margin-mobile py-24 md:px-margin-desktop">
      <section className="mb-16 flex flex-col items-center gap-8 md:flex-row md:items-end">
        <div className="relative">
          <div className="flex size-40 items-center justify-center rounded-full border-4 border-white bg-surface-container-lowest shadow-soft md:size-56">
            <UserRound size={84} strokeWidth={1.5} className="text-secondary" />
          </div>
        </div>
        <div className="flex-1 pb-4 text-center md:text-left">
          <span className="mb-2 block font-label-caps text-label-caps text-on-surface-variant">Thành viên cao cấp</span>
          <h1 className="mb-2 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            {user.full_name}
          </h1>
          <p className="font-body-lg text-body-lg italic text-on-surface-variant/70">Nơi phong cách gặp gỡ sự tinh tế.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <section className="rounded-lg bg-surface-container-lowest p-8 shadow-soft md:p-12 lg:col-span-8">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-primary">Cập nhật thông tin</h2>
            <Lock size={22} strokeWidth={1.8} className="text-outline" />
          </div>

          <form className="space-y-8" onSubmit={handleProfileSubmit}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <ProfileInput label="Họ và tên" value={profileFields.fullName} onChange={(value) => setProfileFields((current) => ({ ...current, fullName: value }))} />
              <ProfileInput label="Ngày sinh" type="date" value={profileFields.dateOfBirth} onChange={(value) => setProfileFields((current) => ({ ...current, dateOfBirth: value }))} />
              <ProfileInput label="Số điện thoại" type="tel" value={profileFields.phone} onChange={(value) => setProfileFields((current) => ({ ...current, phone: value }))} />
              <ProfileInput label="Địa chỉ email" type="email" value={profileFields.email} onChange={(value) => setProfileFields((current) => ({ ...current, email: value }))} />
            </div>
            <StatusMessage message={profileState.message} error={profileState.error} />
            <button
              className="inline-flex items-center justify-center gap-2 rounded bg-primary px-10 py-4 font-button text-button text-on-primary transition-all hover:bg-secondary disabled:cursor-wait disabled:opacity-70"
              disabled={profileState.loading}
              type="submit"
            >
              {profileState.loading ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} /> : null}
              Cập nhật thông tin
            </button>
          </form>
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-lg bg-primary p-8 text-on-primary shadow-soft">
            <span className="mb-6 block font-label-caps text-label-caps opacity-60">Tài khoản Reserve</span>
            <div className="space-y-6">
              <div>
                <div className="mb-1 text-2xl font-light">Hạng Bạch Kim</div>
                <div className="h-1 w-full bg-white/20">
                  <div className="h-full w-3/4 bg-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-label-caps text-[10px] opacity-60">Số điểm tích lũy</p>
                  <p className="text-xl font-semibold">12,450 pts</p>
                </div>
                <Medal size={34} strokeWidth={1.8} />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-surface-container-lowest p-8 shadow-soft">
            <h3 className="mb-6 font-label-caps text-label-caps text-on-surface-variant">Hoạt động gần đây</h3>
            <div className="flex gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded bg-surface-container">
                <House size={22} strokeWidth={1.8} className="text-primary" />
              </div>
              <div>
                <p className="font-body-md leading-tight text-primary">Yêu cầu xem phòng mới nhất</p>
                <p className="mt-1 text-xs text-on-surface-variant">Được đồng bộ qua tài khoản của bạn</p>
              </div>
            </div>
          </div>

          <ViewingRequestsSummary requests={viewingRequests} />

          <PasswordTools
            passwordFields={passwordFields}
            passwordState={passwordState}
            resetEmail={resetEmail}
            resetState={resetState}
            onPasswordChange={setPasswordFields}
            onPasswordSubmit={handlePasswordSubmit}
            onResetEmailChange={setResetEmail}
            onResetSubmit={handleResetSubmit}
          />
        </aside>
      </div>
    </div>
  );
}

function ViewingRequestsSummary({ requests }: Readonly<{ requests: MyViewingRequest[] }>) {
  const recentRequests = requests.slice(0, 3);

  return (
    <div className="rounded-lg bg-surface-container-lowest p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant">Lịch xem phòng của bạn</h3>
        <CalendarClock size={20} strokeWidth={1.8} className="text-outline" />
      </div>

      {recentRequests.length ? (
        <div className="space-y-4">
          {recentRequests.map((request) => (
            <Link
              className="group block rounded-md border border-outline-variant/20 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft"
              href={`/room-details?slug=${encodeURIComponent(request.room.slug)}`}
              key={request.id}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 font-body-md font-semibold text-primary">{request.room.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
                    <MapPin size={13} strokeWidth={1.8} />
                    <span className="truncate">{request.room.ward.name}, {request.room.city.name}</span>
                  </p>
                </div>
                <span className={`shrink-0 rounded border px-2 py-1 text-[11px] font-semibold ${viewingStatusClass(request.status)}`}>
                  {viewingStatusLabel(request.status)}
                </span>
              </div>
              <div className="grid gap-2 border-t border-outline-variant/15 pt-3 text-xs text-on-surface-variant">
                <span>{formatDate(request.preferred_viewing_date || request.confirmed_at)} · {timeSlotLabel(request.preferred_viewing_time_slot)}</span>
                <span className="font-semibold text-primary">{formatVnd(request.room.price, "VNĐ")}/tháng</span>
              </div>
            </Link>
          ))}

          <Link className="inline-flex items-center gap-2 font-button text-button text-primary transition hover:text-gold" href="/rooms">
            Xem thêm phòng phù hợp
            <House size={16} strokeWidth={1.8} />
          </Link>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-outline-variant/30 bg-surface-container-low/60 p-5">
          <p className="font-body-md text-sm text-primary">Bạn chưa có yêu cầu xem phòng nào.</p>
          <Link className="mt-4 inline-flex font-button text-button text-primary transition hover:text-gold" href="/rooms">
            Khám phá danh sách phòng
          </Link>
        </div>
      )}
    </div>
  );
}

function ProfileInput({
  label,
  onChange,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}>) {
  return (
    <label className="space-y-2">
      <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
      <input
        className="w-full border-0 border-b border-outline/20 bg-transparent px-0 py-3 font-body-md text-primary transition-all focus:border-primary focus:ring-0"
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function StatusMessage({ error, message }: Readonly<{ error: string; message: string }>) {
  if (!error && !message) return null;
  const isError = Boolean(error);
  return (
    <div className={`flex gap-3 border p-4 ${isError ? "border-error bg-error-container/30 text-error" : "border-[#4a7c59] bg-[#4a7c59]/10 text-[#4a7c59]"}`}>
      {isError ? <AlertCircle size={18} strokeWidth={1.8} /> : <CheckCircle size={18} strokeWidth={1.8} />}
      <p className="font-body-md text-sm">{error || message}</p>
    </div>
  );
}

function PasswordTools({
  onPasswordChange,
  onPasswordSubmit,
  onResetEmailChange,
  onResetSubmit,
  passwordFields,
  passwordState,
  resetEmail,
  resetState,
}: Readonly<{
  onPasswordChange: (value: ChangePasswordFields) => void;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetEmailChange: (value: string) => void;
  onResetSubmit: (event: FormEvent<HTMLFormElement>) => void;
  passwordFields: ChangePasswordFields;
  passwordState: { loading: boolean; message: string; error: string };
  resetEmail: string;
  resetState: { loading: boolean; message: string; error: string };
}>) {
  return (
    <div className="rounded-lg bg-surface-container-lowest p-8 shadow-soft">
      <div className="mb-6 flex items-center gap-3">
        <KeyRound size={22} strokeWidth={1.8} />
        <h3 className="font-headline-sm text-headline-sm text-primary">Bảo mật</h3>
      </div>

      <form className="space-y-4 border-b border-outline-variant/20 pb-8" onSubmit={onPasswordSubmit}>
        <h4 className="font-label-caps text-label-caps text-on-surface-variant">Đổi mật khẩu</h4>
        <SecurityInput label="Mật khẩu hiện tại" value={passwordFields.oldPassword} onChange={(oldPassword) => onPasswordChange({ ...passwordFields, oldPassword })} />
        <SecurityInput label="Mật khẩu mới" value={passwordFields.newPassword} onChange={(newPassword) => onPasswordChange({ ...passwordFields, newPassword })} />
        <SecurityInput label="Xác nhận mật khẩu mới" value={passwordFields.confirmNewPassword} onChange={(confirmNewPassword) => onPasswordChange({ ...passwordFields, confirmNewPassword })} />
        <StatusMessage message={passwordState.message} error={passwordState.error} />
        <button
          className="w-full rounded border border-primary px-6 py-3 font-button text-button text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-wait disabled:opacity-70"
          disabled={passwordState.loading}
          type="submit"
        >
          {passwordState.loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>

      <form className="space-y-4 pt-8" onSubmit={onResetSubmit}>
        <h4 className="font-label-caps text-label-caps text-on-surface-variant">Quên mật khẩu</h4>
        <p className="font-body-md text-sm text-on-surface-variant">
          Gửi liên kết đặt lại mật khẩu tới email của tài khoản.
        </p>
        <SecurityInput label="Email nhận liên kết" type="email" value={resetEmail} onChange={onResetEmailChange} />
        <StatusMessage message={resetState.message} error={resetState.error} />
        <button
          className="w-full rounded bg-primary px-6 py-3 font-button text-button text-on-primary transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          disabled={resetState.loading}
          type="submit"
        >
          {resetState.loading ? "Đang gửi..." : "Gửi email đặt lại"}
        </button>
      </form>
    </div>
  );
}

function SecurityInput({
  label,
  onChange,
  type = "password",
  value,
}: Readonly<{ label: string; onChange: (value: string) => void; type?: string; value: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block font-body-md text-sm text-on-surface-variant">{label}</span>
      <input
        className="w-full border border-outline-variant/40 bg-transparent px-3 py-3 font-body-md text-primary transition-colors focus:border-primary focus:ring-0"
        minLength={type === "password" ? 8 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
