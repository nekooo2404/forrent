"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { saveAuthSession, type BrowserAuthSession } from "@/lib/auth-storage";

type AuthApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

type TouchedFields = {
  identifier?: boolean;
  password?: boolean;
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
  return payload.message || "Không thể đăng nhập lúc này.";
}

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const identifierValue = String(formData.get("identifier") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    setTouched({ identifier: true, password: true });
    if (!identifierValue || passwordValue.length < 8) {
      toast({
        type: "error",
        title: "Thông tin chưa hợp lệ",
        message: "Vui lòng nhập email hoặc số điện thoại và mật khẩu hợp lệ.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/log-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifierValue, password: passwordValue }),
      });
      const payload = (await response.json()) as AuthApiResponse<BrowserAuthSession>;

      if (!response.ok || !payload.success || !payload.data) {
        toast({
          type: "error",
          title: "Đăng nhập thất bại",
          message: firstErrorMessage(payload),
        });
        return;
      }

      saveAuthSession(payload.data);
      router.replace("/homepage");
      router.refresh();
    } catch {
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể kết nối hệ thống đăng nhập. Vui lòng thử lại sau.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-gutter shadow-soft md:p-12">
      <div className="mb-12 text-center lg:text-left">
        <h1 className="mb-2 font-headline-md text-headline-md text-primary">Chào mừng trở lại</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Đăng nhập để truy cập bộ sưu tập tuyển chọn của bạn.
        </p>
      </div>

      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <div className="relative">
          <input
            className="peer w-full border-0 border-b border-outline-variant bg-transparent px-0 pb-2 pt-6 font-body-md text-body-md text-on-surface placeholder-transparent transition-colors focus:border-primary focus:outline-none focus:ring-0"
            id="identifier"
            name="identifier"
            onBlur={() => setTouched((current) => ({ ...current, identifier: true }))}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setIdentifier(event.target.value)}
            placeholder="Email hoặc số điện thoại"
            required
            type="text"
            value={identifier}
          />
          <label
            className="pointer-events-none absolute left-0 top-6 origin-left font-body-md text-body-md text-on-surface-variant transition-[transform,color] duration-300 peer-focus:-translate-y-6 peer-focus:scale-[0.85] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-[0.85]"
            htmlFor="identifier"
          >
            Email hoặc số điện thoại
          </label>
          {touched.identifier && !identifier.trim() ? (
            <p className="mt-1 min-h-4 font-body-md text-xs text-error">
              Vui lòng nhập email hoặc số điện thoại hợp lệ.
            </p>
          ) : (
            <div className="mt-1 min-h-4" />
          )}
        </div>

        <div className="relative">
          <input
            className="peer w-full border-0 border-b border-outline-variant bg-transparent px-0 pb-2 pt-6 pr-10 font-body-md text-body-md text-on-surface placeholder-transparent transition-colors focus:border-primary focus:outline-none focus:ring-0"
            id="password"
            minLength={8}
            name="password"
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            placeholder="Mật khẩu"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <label
            className="pointer-events-none absolute left-0 top-6 origin-left font-body-md text-body-md text-on-surface-variant transition-[transform,color] duration-300 peer-focus:-translate-y-6 peer-focus:scale-[0.85] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-[0.85]"
            htmlFor="password"
          >
            Mật khẩu
          </label>
          <button
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-0 top-2 flex size-11 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
          </button>
          {touched.password && password.length < 8 ? (
            <p className="mt-1 min-h-4 font-body-md text-xs text-error">Mật khẩu phải có ít nhất 8 ký tự.</p>
          ) : (
            <div className="mt-1 min-h-4" />
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant" htmlFor="remember-me">
            <input
              className="size-4 rounded border-outline-variant bg-transparent text-primary focus:ring-primary focus:ring-offset-surface"
              id="remember-me"
              name="remember-me"
              type="checkbox"
            />
            Ghi nhớ đăng nhập
          </label>
          <Link className="font-body-md text-body-md text-primary transition-colors hover:text-gold" href="/forget-password">
            Quên mật khẩu?
          </Link>
        </div>

        <button
          className="mt-6 flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-4 font-button text-button uppercase tracking-widest text-on-primary transition-colors duration-300 hover:bg-surface-tint disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} /> : null}
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Bạn chưa có tài khoản?{" "}
          <Link className="font-semibold text-primary transition-colors hover:text-gold" href="/sign-up">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
