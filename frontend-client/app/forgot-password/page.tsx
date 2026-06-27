import type { Metadata } from "next";
import { Suspense } from "react";

import { ForgotPasswordClient } from "@/components/profile/forgot-password-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Quên mật khẩu - Aurelian Reserve",
  description: "Yêu cầu liên kết đặt lại mật khẩu cho tài khoản Aurelian Reserve.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav />
      <section className="flex flex-grow items-center justify-center px-margin-mobile pb-20 pt-32 md:px-margin-desktop">
        <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-surface-container" />}>
          <ForgotPasswordClient />
        </Suspense>
      </section>
      <SiteFooter />
    </main>
  );
}
