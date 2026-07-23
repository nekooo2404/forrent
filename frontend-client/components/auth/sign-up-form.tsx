"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "@/components/ui/icons";
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from "react";
import { useMemo, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { saveAuthSession, type BrowserAuthSession } from "@/lib/auth-storage";
import type { ApiUser } from "@/lib/api";
import { validators } from "@/lib/validation";

type AuthApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

type SignUpFields = {
  fullName: string;
  phone: string;
  email: string;
  accountRole: "TENANT" | "LANDLORD";
  otp: string;
  password: string;
  confirmPassword: string;
};

const initialFields: SignUpFields = {
  fullName: "",
  phone: "",
  email: "",
  accountRole: "TENANT",
  otp: "",
  password: "",
  confirmPassword: "",
};

const accountRoleOptions: Array<{
  value: SignUpFields["accountRole"];
  title: string;
  description: string;
}> = [
  {
    value: "TENANT",
    title: "Người thuê",
    description: "Tìm phòng, đặt lịch xem và theo dõi yêu cầu của bạn.",
  },
  {
    value: "LANDLORD",
    title: "Người cho thuê",
    description: "Tạo, đăng và quản lý phòng của bạn trực tiếp.",
  },
];

function firstErrorMessage(payload: AuthApiResponse<unknown>) {
  if (payload.errors && typeof payload.errors === "object") {
    const firstValue = Object.values(payload.errors as Record<string, unknown>)[0];
    if (Array.isArray(firstValue) && firstValue[0]) {
      return String(firstValue[0]);
    }
    if (firstValue) {
      return String(firstValue);
    }
  }
  return payload.message || "Không thể đăng ký tài khoản lúc này.";
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length > 0) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) {
    return { width: "0%", label: "", className: "bg-transparent", textClassName: "text-outline" };
  }
  if (score <= 1) {
    return { width: "25%", label: "Yếu", className: "bg-error", textClassName: "text-error" };
  }
  if (score === 2) {
    return { width: "50%", label: "Trung bình", className: "bg-surface-tint", textClassName: "text-surface-tint" };
  }
  return { width: "100%", label: "Mạnh", className: "bg-primary", textClassName: "text-primary" };
}

function strengthScaleClass(width: string) {
  return (
    {
      "0%": "scale-x-0",
      "25%": "scale-x-[0.25]",
      "50%": "scale-x-50",
      "100%": "scale-x-100",
    }[width] ?? "scale-x-0"
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "verify">("details");
  const [fields, setFields] = useState(initialFields);
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpFields, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const registrationInFlight = useRef(false);
  const otpInFlight = useRef(false);
  const { toast } = useToast();
  const strength = useMemo(() => passwordStrength(fields.password), [fields.password]);

  function updateField(field: keyof SignUpFields) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setFields((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function touchField(field: keyof SignUpFields) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function fieldErrors() {
    return {
      otp: validators.otp(fields.otp),
      fullName: validators.required(fields.fullName, "họ và tên của bạn"),
      phone: validators.phone(fields.phone),
      email: validators.email(fields.email),
      password: validators.password(fields.password),
      confirmPassword: validators.confirmPassword(fields.password, fields.confirmPassword),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = fieldErrors();
    if (step === "details") {
      setTouched({ fullName: true, phone: true, email: true, password: true, confirmPassword: true });
      if (errors.fullName || errors.phone || errors.email || errors.password || errors.confirmPassword) {
        toast({
          type: "error",
          title: "Thông tin chưa hợp lệ",
          message: "Vui lòng kiểm tra lại thông tin đăng ký.",
        });
        return;
      }
      if (await sendOtp()) setStep("verify");
      return;
    }

    setTouched((current) => ({ ...current, otp: true }));
    if (errors.otp) {
      toast({
        type: "error",
        title: "Mã xác thực chưa hợp lệ",
        message: errors.otp,
      });
      return;
    }

    if (registrationInFlight.current) return;
    registrationInFlight.current = true;
    setIsSubmitting(true);

    try {
      const registerResponse = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fields.fullName.trim(),
          phone: fields.phone.trim(),
          email: fields.email.trim(),
          role: fields.accountRole,
          otp: fields.otp.trim(),
          password: fields.password,
          confirm_password: fields.confirmPassword,
        }),
      });
      if (!registerResponse.ok) {
        const errorPayload = (await registerResponse.json().catch(() => null)) as AuthApiResponse<unknown> | null;
        toast({
          type: "error",
          title: "Đăng ký thất bại",
          message: errorPayload ? firstErrorMessage(errorPayload) : "Không thể đăng ký tài khoản lúc này.",
        });
        return;
      }
      const registerPayload = (await registerResponse.json().catch(() => null)) as AuthApiResponse<ApiUser> | null;
      if (!registerPayload?.success) {
        toast({
          type: "error",
          title: "Đăng ký thất bại",
          message: registerPayload ? firstErrorMessage(registerPayload) : "Phản hồi đăng ký không hợp lệ.",
        });
        return;
      }

      const loginResponse = await fetch("/api/auth/log-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: fields.email.trim(), password: fields.password }),
      });
      const loginPayload = loginResponse.ok
        ? ((await loginResponse.json().catch(() => null)) as AuthApiResponse<BrowserAuthSession> | null)
        : null;

      if (loginPayload?.success && loginPayload.data) {
        saveAuthSession(loginPayload.data);
        router.replace(loginPayload.data.user.role === "LANDLORD" ? "/landlord/rooms" : "/");
        router.refresh();
        return;
      }

      setFields(initialFields);
      setTouched({});
      toast({
        type: "success",
        title: "Tài khoản đã được tạo",
        message: "Vui lòng đăng nhập bằng email và mật khẩu vừa đăng ký.",
      });
    } catch {
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể kết nối hệ thống đăng ký. Vui lòng thử lại sau.",
      });
    } finally {
      registrationInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  const errors = fieldErrors();

  async function sendOtp() {
    const emailError = fieldErrors().email;
    setTouched((current) => ({ ...current, email: true }));
    if (emailError) {
      toast({
        type: "error",
        title: "Email chưa hợp lệ",
        message: emailError,
      });
      return false;
    }
    if (otpInFlight.current) return;
    otpInFlight.current = true;
    setIsSendingOtp(true);
    try {
      const response = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fields.email.trim(), purpose: "REGISTER" }),
      });
      const payload = (await response.json()) as AuthApiResponse<Record<string, never>>;
      if (!response.ok || !payload.success) {
        toast({
          type: "error",
          title: "Không thể gửi OTP",
          message: firstErrorMessage(payload),
        });
        return false;
      }
      toast({
        type: "success",
        title: "Đã gửi mã OTP",
        message: "Mã OTP đã được gửi tới email của bạn.",
      });
      return true;
    } catch {
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể gửi mã OTP lúc này.",
      });
      return false;
    } finally {
      otpInFlight.current = false;
      setIsSendingOtp(false);
    }
  }

  async function handleSendOtp() {
    await sendOtp();
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-8 shadow-soft md:p-10">
      <div className="mb-10 text-center">
        <p className="mb-3 text-sm font-semibold text-tertiary">Bước {step === "details" ? "1" : "2"} / 2</p>
        <h1 className="mb-3 font-headline-md text-headline-md text-on-surface">Đăng ký tài khoản</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {step === "details" ? "Nhập thông tin liên hệ để tạo tài khoản." : `Nhập mã 6 số đã gửi tới ${fields.email}.`}
        </p>
      </div>

      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        {step === "details" ? (
          <>
            <AuthInput
              autoComplete="name"
              error={touched.fullName ? errors.fullName : ""}
              id="fullName"
              label="Họ và tên"
              name="fullName"
              onBlur={() => touchField("fullName")}
              onChange={updateField("fullName")}
              placeholder="Nguyễn Văn A"
              value={fields.fullName}
            />
          <AuthInput
            autoComplete="tel"
            error={touched.phone ? errors.phone : ""}
            id="phone"
            inputMode="tel"
            label="Số điện thoại"
            name="phone"
            onBlur={() => touchField("phone")}
            onChange={updateField("phone")}
            pattern="[0-9]{10,11}"
            placeholder="0912345678"
            type="tel"
            value={fields.phone}
          />
            <AuthInput
              autoComplete="email"
              error={touched.email ? errors.email : ""}
              id="email"
              label="Email"
              name="email"
              onBlur={() => touchField("email")}
              onChange={updateField("email")}
              placeholder="email@example.com"
              type="email"
              value={fields.email}
            />
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-on-surface">Vai trò tài khoản</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {accountRoleOptions.map((option) => {
                  const selected = fields.accountRole === option.value;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-24 rounded-md border px-4 py-3 text-left transition-colors duration-200 ${
                        selected
                          ? "border-primary bg-primary-container text-on-primary-container"
                          : "border-outline-variant/70 bg-surface-container-low text-on-surface hover:border-primary/60"
                      }`}
                      key={option.value}
                      onClick={() => setFields((current) => ({ ...current, accountRole: option.value }))}
                      type="button"
                    >
                      <span className="block text-base font-semibold">{option.title}</span>
                      <span className="mt-2 block text-sm leading-5 text-on-surface-variant">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div>
              <AuthInput
                autoComplete="new-password"
                error={touched.password ? errors.password : ""}
                id="password"
                label="Mật khẩu"
                minLength={8}
                name="password"
                onBlur={() => touchField("password")}
                onChange={updateField("password")}
                placeholder="Ít nhất 8 ký tự"
                type="password"
                value={fields.password}
              />
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-variant">
                  <div className={`h-full w-full origin-left transition-transform duration-300 ${strength.className} ${strengthScaleClass(strength.width)}`} />
                </div>
                <span className={`min-w-16 text-right text-xs font-semibold ${strength.textClassName}`}>{strength.label}</span>
              </div>
            </div>
            <AuthInput
              autoComplete="new-password"
              error={touched.confirmPassword ? errors.confirmPassword : ""}
              id="confirmPassword"
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              onBlur={() => touchField("confirmPassword")}
              onChange={updateField("confirmPassword")}
              placeholder="Nhập lại mật khẩu"
              type="password"
              value={fields.confirmPassword}
            />
          </>
        ) : (
          <>
            <AuthInput
              autoComplete="one-time-code"
              error={touched.otp ? errors.otp : ""}
              id="otp"
              inputMode="numeric"
              label="Mã xác thực"
              maxLength={6}
              name="otp"
              onBlur={() => touchField("otp")}
              onChange={updateField("otp")}
              pattern="[0-9]{6}"
              placeholder="6 chữ số"
              value={fields.otp}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-on-surface-variant hover:text-primary" onClick={() => setStep("details")} type="button">
                Sửa thông tin
              </button>
              <button className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-primary disabled:opacity-60" disabled={isSendingOtp} onClick={handleSendOtp} type="button">
                {isSendingOtp ? "Đang gửi lại..." : "Gửi lại mã"}
              </button>
            </div>
          </>
        )}

        <button
          className="premium-button mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-button text-button text-on-primary transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting || isSendingOtp}
          type="submit"
        >
          {isSubmitting || isSendingOtp ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} /> : null}
          {step === "details" ? (isSendingOtp ? "Đang gửi mã..." : "Tiếp tục xác thực") : (isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản")}
        </button>
      </form>

      <div className="mt-10 border-t border-outline-variant/70 pt-6 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Đã có tài khoản?{" "}
          <Link className="inline-flex min-h-11 items-center font-semibold text-primary transition-colors duration-200 hover:text-primary/80" href="/log-in">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

function AuthInput({
  error,
  label,
  ...props
}: Readonly<InputHTMLAttributes<HTMLInputElement> & { error?: string; label: string }>) {
  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-semibold text-on-surface" htmlFor={props.id}>
        {label}
      </label>
      <div className="rounded-md border border-outline-variant/70 bg-surface-container-low transition-colors duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
        <input
          className="min-h-11 w-full rounded-md border-none bg-transparent px-3 py-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:ring-0"
          {...props}
        />
      </div>
      <p className="mt-1 min-h-5 font-body-md text-xs leading-5 text-error">{error}</p>
    </div>
  );
}
