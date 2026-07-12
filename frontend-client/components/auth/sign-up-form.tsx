"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import type { ChangeEvent, FormEvent, InputHTMLAttributes } from "react";
import { useMemo, useState } from "react";

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
  dateOfBirth: string;
  phone: string;
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
};

const initialFields: SignUpFields = {
  fullName: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  otp: "",
  password: "",
  confirmPassword: "",
};

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

function strengthWidthClass(width: string) {
  return (
    {
      "0%": "w-0",
      "25%": "w-1/4",
      "50%": "w-1/2",
      "100%": "w-full",
    }[width] ?? "w-0"
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpFields, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
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
      dateOfBirth: !fields.dateOfBirth ? "Vui lòng chọn ngày sinh." : "",
      phone: validators.phone(fields.phone),
      email: validators.email(fields.email),
      password: validators.password(fields.password),
      confirmPassword: validators.confirmPassword(fields.password, fields.confirmPassword),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = fieldErrors();
    setTouched({
      fullName: true,
      dateOfBirth: true,
      phone: true,
      email: true,
      otp: true,
      password: true,
      confirmPassword: true,
    });
    if (Object.values(errors).some(Boolean)) {
      toast({
        type: "error",
        title: "Thông tin chưa hợp lệ",
        message: "Vui lòng kiểm tra lại thông tin đăng ký.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const registerResponse = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fields.fullName.trim(),
          date_of_birth: fields.dateOfBirth,
          phone: fields.phone.trim(),
          email: fields.email.trim(),
          otp: fields.otp.trim(),
          password: fields.password,
          confirm_password: fields.confirmPassword,
        }),
      });
      const registerPayload = (await registerResponse.json()) as AuthApiResponse<ApiUser>;

      if (!registerResponse.ok || !registerPayload.success) {
        toast({
          type: "error",
          title: "Đăng ký thất bại",
          message: firstErrorMessage(registerPayload),
        });
        return;
      }

      const loginResponse = await fetch("/api/auth/log-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: fields.email.trim(), password: fields.password }),
      });
      const loginPayload = (await loginResponse.json()) as AuthApiResponse<BrowserAuthSession>;

      if (loginResponse.ok && loginPayload.success && loginPayload.data) {
        saveAuthSession(loginPayload.data);
        router.replace("/homepage");
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
      setIsSubmitting(false);
    }
  }

  const errors = fieldErrors();

  async function handleSendOtp() {
    const emailError = fieldErrors().email;
    setTouched((current) => ({ ...current, email: true }));
    if (emailError) {
      toast({
        type: "error",
        title: "Email chưa hợp lệ",
        message: emailError,
      });
      return;
    }
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
        return;
      }
      toast({
        type: "success",
        title: "Đã gửi mã OTP",
        message: "Mã OTP đã được gửi tới email của bạn.",
      });
    } catch {
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể gửi mã OTP lúc này.",
      });
    } finally {
      setIsSendingOtp(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-8 shadow-elevated md:p-10">
      <div className="mb-10 text-center">
        <h1 className="mb-3 font-headline-md text-headline-md text-primary">Đăng ký tài khoản</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Tạo tài khoản để đặt lịch xem phòng và theo dõi yêu cầu của bạn.</p>
      </div>

      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <AuthInput
          error={touched.fullName ? errors.fullName : ""}
          id="fullName"
          label="Họ và tên"
          name="fullName"
          onBlur={() => touchField("fullName")}
          onChange={updateField("fullName")}
          placeholder="Nguyễn Văn A"
          value={fields.fullName}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AuthInput
            error={touched.dateOfBirth ? errors.dateOfBirth : ""}
            id="dateOfBirth"
            label="Ngày sinh"
            name="dateOfBirth"
            onBlur={() => touchField("dateOfBirth")}
            onChange={updateField("dateOfBirth")}
            type="date"
            value={fields.dateOfBirth}
          />
          <AuthInput
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
        </div>

        <AuthInput
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

        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <AuthInput
            error={touched.otp ? errors.otp : ""}
            id="otp"
            inputMode="numeric"
            label="Mã OTP"
            maxLength={6}
            name="otp"
            onBlur={() => touchField("otp")}
            onChange={updateField("otp")}
            pattern="[0-9]{6}"
            placeholder="123456"
            value={fields.otp}
          />
          <button
            className="mt-7 rounded border border-primary px-4 py-2 font-button text-button text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-wait disabled:opacity-60"
            disabled={isSendingOtp}
            onClick={handleSendOtp}
            type="button"
          >
            {isSendingOtp ? "Đang gửi" : "Gửi mã"}
          </button>
        </div>

        <div>
          <AuthInput
            error={touched.password ? errors.password : ""}
            id="password"
            label="Mật khẩu"
            minLength={8}
            name="password"
            onBlur={() => touchField("password")}
            onChange={updateField("password")}
            placeholder="••••••••"
            type="password"
            value={fields.password}
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-variant">
              <div className={`h-full transition-all duration-300 ${strength.className} ${strengthWidthClass(strength.width)}`} />
            </div>
            <span className={`min-w-16 text-right text-[10px] uppercase tracking-wider ${strength.textClassName}`}>
              {strength.label}
            </span>
          </div>
        </div>

        <AuthInput
          error={touched.confirmPassword ? errors.confirmPassword : ""}
          id="confirmPassword"
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          onBlur={() => touchField("confirmPassword")}
          onChange={updateField("confirmPassword")}
          placeholder="••••••••"
          type="password"
          value={fields.confirmPassword}
        />

        <button
          className="premium-button mt-4 flex w-full items-center justify-center gap-2 rounded bg-primary py-4 font-button text-button uppercase text-on-primary shadow-lg hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} /> : null}
          {isSubmitting ? "Đang xử lý..." : "Tạo tài khoản"}
        </button>
      </form>

      <div className="mt-10 border-t border-outline-variant/10 pt-8 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Đã có tài khoản?{" "}
          <Link className="font-medium text-primary transition-colors hover:underline" href="/log-in">
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
      <label className="mb-2 block font-label-caps text-label-caps uppercase tracking-widest text-primary" htmlFor={props.id}>
        {label}
      </label>
      <div className="border-b border-outline-variant transition-colors focus-within:border-primary">
        <input
          className="w-full border-none bg-transparent px-0 py-2 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:ring-0"
          {...props}
        />
      </div>
      <p className="mt-1 min-h-4 font-body-md text-[12px] text-error">{error}</p>
    </div>
  );
}
