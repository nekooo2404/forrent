import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ForgotPasswordClient } from "@/components/profile/forgot-password-client";

export const metadata: Metadata = {
  title: "Quên mật khẩu Admin - ForRent",
  description: "Yêu cầu hoặc xác nhận đặt lại mật khẩu cho tài khoản ForRent.",
};

export default function ForgetPasswordPage() {
  return (
    <main className="admin-surface flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 text-primary">
      <div className="mb-8 text-center">
        <Link className="font-headline-sm text-2xl uppercase tracking-normal" href="/admin">
          ForRent Admin
        </Link>
        <p className="mt-2 text-sm text-secondary">Khôi phục quyền truy cập tài khoản quản trị.</p>
      </div>
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-white/80 shadow-soft" />}>
        <ForgotPasswordClient />
      </Suspense>
    </main>
  );
}
