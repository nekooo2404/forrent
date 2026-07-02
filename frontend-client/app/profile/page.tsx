import type { Metadata } from "next";

import { ProfileClient } from "@/components/profile/profile-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Thông tin người dùng - ForRent",
  description: "Quản lý thông tin cá nhân, cập nhật hồ sơ và bảo mật tài khoản ForRent.",
};

export default function ProfilePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav />
      <div className="flex-grow pt-20">
        <ProfileClient />
      </div>
      <SiteFooter />
    </main>
  );
}
