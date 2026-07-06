import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản - ForRent",
  description: "Tạo tài khoản ForRent để đặt lịch xem phòng và theo dõi yêu cầu thuê phòng.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav />

      <section className="flex flex-grow items-center justify-center px-margin-mobile pb-20 pt-32 md:px-margin-desktop">
        <SignUpForm />
      </section>

      <SiteFooter />
    </main>
  );
}
