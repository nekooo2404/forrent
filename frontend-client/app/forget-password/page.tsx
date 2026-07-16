import type { Metadata } from "next";
import { Suspense } from "react";

import { ForgotPasswordClient } from "@/components/profile/forgot-password-client";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  description: "Yêu cầu liên kết đặt lại mật khẩu cho tài khoản ForRent.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgetPasswordPage() {
  return (
    <PublicShell>
      <section className="flex flex-grow items-center justify-center px-margin-mobile pb-20 pt-32 md:px-margin-desktop">
        <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-surface-container" />}>
          <ForgotPasswordClient />
        </Suspense>
      </section>
    </PublicShell>
  );
}
