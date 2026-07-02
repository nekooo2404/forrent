"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle, LoaderCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

function messageFrom(payload: ApiResponse<unknown>, fallback: string) {
  if (payload.errors && typeof payload.errors === "object") {
    const firstValue = Object.values(payload.errors as Record<string, unknown>)[0];
    if (Array.isArray(firstValue) && firstValue[0]) return String(firstValue[0]);
    if (firstValue) return String(firstValue);
  }
  return payload.message || fallback;
}

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [state, setState] = useState({ loading: false, message: "", error: "" });

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, message: "", error: "" });

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = (await response.json()) as ApiResponse<Record<string, never>>;
      if (!response.ok || !payload.success) {
        setState({ loading: false, message: "", error: messageFrom(payload, "Không thể gửi OTP.") });
        return;
      }
      setState({ loading: false, message: "Nếu email tồn tại, mã OTP đã được gửi.", error: "" });
    } catch {
      setState({ loading: false, message: "", error: "Không thể kết nối hệ thống quên mật khẩu." });
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setState({ loading: false, message: "", error: "Mật khẩu xác nhận không khớp." });
      return;
    }

    setState({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          new_password: newPassword,
          confirm_new_password: confirmNewPassword,
        }),
      });
      const payload = (await response.json()) as ApiResponse<Record<string, never>>;
      if (!response.ok || !payload.success) {
        setState({ loading: false, message: "", error: messageFrom(payload, "Không thể đặt lại mật khẩu.") });
        return;
      }
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setState({ loading: false, message: "Mật khẩu đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới.", error: "" });
    } catch {
      setState({ loading: false, message: "", error: "Không thể kết nối hệ thống đặt lại mật khẩu." });
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-elevated md:p-10">
      <div className="mb-10 text-center">
        <h1 className="mb-3 font-headline-md text-headline-md text-primary">Quên mật khẩu</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Nhập email để nhận OTP, sau đó đặt lại mật khẩu.</p>
      </div>

      <form className="mb-6 space-y-6" onSubmit={handleRequest}>
        <AuthInput label="Địa chỉ email" type="email" value={email} onChange={setEmail} />
        <SubmitButton loading={state.loading}>Gửi OTP</SubmitButton>
      </form>

      <form className="space-y-6" onSubmit={handleConfirm}>
        <AuthInput label="Mã OTP" maxLength={6} type="text" value={otp} onChange={setOtp} />
        <AuthInput label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
        <AuthInput label="Xác nhận mật khẩu mới" value={confirmNewPassword} onChange={setConfirmNewPassword} />
        <Status message={state.message} error={state.error} />
        <SubmitButton loading={state.loading}>Đặt lại mật khẩu</SubmitButton>
      </form>

      <div className="mt-8 border-t border-outline-variant/10 pt-6 text-center">
        <Link className="font-body-md text-body-md text-primary transition-colors hover:text-gold" href="/log-in">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}

function AuthInput({
  label,
  maxLength,
  onChange,
  type = "password",
  value,
}: Readonly<{ label: string; maxLength?: number; onChange: (value: string) => void; type?: string; value: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-caps text-label-caps uppercase tracking-widest text-primary">{label}</span>
      <input
        className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 font-body-md text-primary transition-colors focus:border-primary focus:ring-0"
        maxLength={maxLength}
        minLength={type === "password" ? 8 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function Status({ error, message }: Readonly<{ error: string; message: string }>) {
  if (!error && !message) return null;
  const isError = Boolean(error);
  return (
    <div className={`flex gap-3 border p-4 ${isError ? "border-error bg-error-container/30 text-error" : "border-success/30 bg-success-container/40 text-success"}`}>
      {isError ? <AlertCircle size={18} strokeWidth={1.8} /> : <CheckCircle size={18} strokeWidth={1.8} />}
      <p className="font-body-md text-sm">{error || message}</p>
    </div>
  );
}

function SubmitButton({ children, loading }: Readonly<{ children: string; loading: boolean }>) {
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded bg-primary py-4 font-button text-button uppercase text-on-primary transition-colors hover:bg-surface-tint disabled:cursor-wait disabled:opacity-70"
      disabled={loading}
      type="submit"
    >
      {loading ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} /> : null}
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}
