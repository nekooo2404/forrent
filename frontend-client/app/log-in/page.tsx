import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Đăng nhập - ForRent",
  description: "Đăng nhập tài khoản ForRent để đặt lịch xem phòng và theo dõi yêu cầu.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LogInPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav />

      <section className="flex flex-grow flex-col pt-20 lg:min-h-[calc(100dvh-80px)] lg:flex-row">
        <div className="urban-band relative hidden overflow-hidden lg:block lg:w-1/2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_22%,rgb(var(--primary)_/_0.28),transparent_24rem)]" />
          <div className="relative flex h-full min-h-[640px] items-center justify-center p-12">
            <div className="max-w-md rounded-2xl border border-primary/20 bg-surface-container-lowest/80 p-8 shadow-high backdrop-blur">
              <Image
                alt="ForRent"
                className="h-auto w-44 rounded-lg bg-surface-container-lowest p-3 dark:bg-inverse-surface"
                height={96}
                priority
                src="/brand/forrent-logo.png"
                width={240}
              />
              <h2 className="mt-8 font-headline-md text-headline-md text-primary">Quản lý lịch xem phòng rõ ràng</h2>
              <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
                Đăng nhập để theo dõi yêu cầu, trạng thái xác nhận và thông tin phòng đã chọn.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex w-full items-center justify-center bg-surface p-margin-mobile md:p-margin-desktop lg:w-1/2">
          <LoginForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
