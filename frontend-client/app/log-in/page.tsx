import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Đăng nhập - ForRent",
  description: "Đăng nhập tài khoản ForRent để đặt lịch xem phòng và theo dõi yêu cầu.",
};

const loginImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCtw9mkiyULwAJDZlr58-XTWuQy9BWCd408Ew6MX6IOii-aqmDvfs8Gwo4n9QOMzSCGMAaQHWJRxJljK_AkaWnsv1RgbOXKRHy0M7L0rvThVVdFD48uIsXvcrmOqm52YVexbwnbdyFpVzVDwvQbG7kZUSLUezoTh47eVxpY5bcnPIccvrF8Bnq_agdsNKODA4_qW_Yj9DqLZqTUJ4R1HKa79oByOYxifkMvRmG0dblpy6f65cwvH7O8OoXr7k7aM3tY6vV0k66S1gqd";

export default function LogInPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav />

      <section className="flex flex-grow flex-col pt-20 lg:min-h-[calc(100dvh-80px)] lg:flex-row">
        <div className="relative hidden overflow-hidden bg-surface-container lg:block lg:w-1/2">
          <Image
            alt="Không gian phòng thuê sáng, gọn và đầy đủ tiện ích"
            className="object-cover"
            fill
            priority
            sizes="50vw"
            src={loginImage}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
        </div>

        <div className="relative z-10 flex w-full items-center justify-center bg-surface p-margin-mobile md:p-margin-desktop lg:w-1/2">
          <LoginForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
