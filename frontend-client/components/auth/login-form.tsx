"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "@/components/ui/icons";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

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
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const { toast } = useToast();

  useEffect(() => setIsReady(true), []);

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

    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
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
      router.replace("/");
      router.refresh();
    } catch {
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể kết nối hệ thống đăng nhập. Vui lòng thử lại sau.",
      });
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-gutter shadow-soft md:p-12">
      <div className="mb-10 text-center lg:text-left">
        <h1 className="mb-2 font-headline-md text-headline-md text-on-surface">Chào mừng trở lại</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Đăng nhập để theo dõi yêu cầu xem phòng và lịch đã xác nhận.
        </p>
      </div>

      <form aria-busy={isSubmitting} className="space-y-6" data-ready={isReady ? "true" : "false"} noValidate onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-on-surface" htmlFor="identifier">
            Email hoặc số điện thoại
          </label>
          <input
            className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-3 text-base text-on-surface outline-none transition-colors duration-200 placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/10"
            id="identifier"
            disabled={!isReady || isSubmitting}
            name="identifier"
            onBlur={(event) => {
              setIdentifier(event.currentTarget.value);
              setTouched((current) => ({ ...current, identifier: true }));
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setIdentifier(event.target.value)}
            placeholder="email@domain.vn hoặc 09xxxxxxxx"
            required
            type="text"
          />
          {touched.identifier && !identifier.trim() ? (
            <p className="mt-1 min-h-4 font-body-md text-xs text-error">
              Vui lòng nhập email hoặc số điện thoại hợp lệ.
            </p>
          ) : (
            <div className="mt-1 min-h-4" />
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-on-surface" htmlFor="password">
            Mật khẩu
          </label>
          <div className="relative">
            <input
            className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-3 pr-12 text-base text-on-surface outline-none transition-colors duration-200 placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/10"
            id="password"
            disabled={!isReady || isSubmitting}
            minLength={8}
            name="password"
            onBlur={(event) => {
              setPassword(event.currentTarget.value);
              setTouched((current) => ({ ...current, password: true }));
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            required
            type={showPassword ? "text" : "password"}
            />
          <button
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-0 top-0 flex size-11 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
            disabled={!isReady || isSubmitting}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
          </button>
          </div>
          {touched.password && password.length < 8 ? (
            <p className="mt-1 min-h-4 font-body-md text-xs text-error">Mật khẩu phải có ít nhất 8 ký tự.</p>
          ) : (
            <div className="mt-1 min-h-4" />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 font-body-md text-body-md text-on-surface-variant" htmlFor="remember-me">
            <input
              className="size-4 rounded border-outline-variant bg-transparent text-primary focus:ring-primary focus:ring-offset-surface"
              id="remember-me"
              disabled={!isReady || isSubmitting}
              name="remember-me"
              type="checkbox"
            />
            Ghi nhớ đăng nhập
          </label>
          <Link className="inline-flex min-h-11 items-center font-body-md text-body-md font-semibold text-primary transition-colors duration-200 hover:text-primary/80" href="/forget-password">
            Quên mật khẩu?
          </Link>
        </div>

        <button
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-button text-button text-on-primary transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
          disabled={!isReady || isSubmitting}
          type="submit"
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" size={18} strokeWidth={1.8} /> : null}
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Bạn chưa có tài khoản?{" "}
          <Link className="inline-flex min-h-11 items-center font-semibold text-primary transition-colors duration-200 hover:text-primary/80" href="/sign-up">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
