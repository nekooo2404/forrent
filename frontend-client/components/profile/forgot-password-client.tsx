"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/hooks/use-toast";
import { validators } from "@/lib/validation";

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
  const [state, setState] = useState({ loading: false });
  const { toast } = useToast();

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailError = validators.email(email);
    if (emailError) {
      toast({ type: "error", title: "Email chưa hợp lệ", message: emailError });
      return;
    }

    setState({ loading: true });

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = (await response.json()) as ApiResponse<Record<string, never>>;
      if (!response.ok || !payload.success) {
        toast({ type: "error", title: "Không thể gửi OTP", message: messageFrom(payload, "Không thể gửi OTP.") });
        setState({ loading: false });
        return;
      }
      toast({ type: "success", title: "Đã gửi yêu cầu", message: "Nếu email tồn tại, mã OTP đã được gửi." });
      setState({ loading: false });
    } catch {
      toast({ type: "error", title: "Lỗi kết nối", message: "Không thể kết nối hệ thống quên mật khẩu." });
      setState({ loading: false });
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const otpError = validators.otp(otp);
    const passwordError = validators.password(newPassword);
    if (otpError || passwordError) {
      toast({ type: "error", title: "Thông tin chưa hợp lệ", message: otpError || passwordError });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({ type: "error", title: "Mật khẩu chưa khớp", message: "Mật khẩu xác nhận không khớp." });
      return;
    }

    setState({ loading: true });

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
        toast({ type: "error", title: "Không thể đặt lại mật khẩu", message: messageFrom(payload, "Không thể đặt lại mật khẩu.") });
        setState({ loading: false });
        return;
      }
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast({ type: "success", title: "Đã đặt lại mật khẩu", message: "Bạn có thể đăng nhập bằng mật khẩu mới." });
      setState({ loading: false });
    } catch {
      toast({ type: "error", title: "Lỗi kết nối", message: "Không thể kết nối hệ thống đặt lại mật khẩu." });
      setState({ loading: false });
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-elevated md:p-10">
      <div className="mb-10 text-center">
        <h1 className="mb-3 font-headline-md text-headline-md text-primary">Quên mật khẩu</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Nhập email để nhận OTP, sau đó đặt lại mật khẩu.
        </p>
      </div>

      <form className="mb-6 space-y-6" onSubmit={handleRequest}>
        <AuthInput label="Địa chỉ email" type="email" value={email} onChange={setEmail} />
        <SubmitButton loading={state.loading}>Gửi OTP</SubmitButton>
      </form>

      <form className="space-y-6" onSubmit={handleConfirm}>
        <AuthInput label="Mã OTP" maxLength={6} type="text" value={otp} onChange={setOtp} />
        <AuthInput label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
        <AuthInput label="Xác nhận mật khẩu mới" value={confirmNewPassword} onChange={setConfirmNewPassword} />
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
  const inputId = useId();

  return (
    <FormField htmlFor={inputId} label={label}>
      <input
        id={inputId}
        className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 font-body-md text-primary transition-colors focus:border-primary focus:ring-0"
        maxLength={maxLength}
        minLength={type === "password" ? 8 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </FormField>
  );
}

function SubmitButton({ children, loading }: Readonly<{ children: string; loading: boolean }>) {
  return (
    <Button
      className="w-full rounded bg-primary py-4 hover:bg-surface-tint"
      loading={loading}
      type="submit"
    >
      {children}
    </Button>
  );
}
