import type { Metadata } from "next";

import { ProfileClient } from "@/components/profile/profile-client";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Thông tin người dùng",
  description: "Quản lý thông tin cá nhân, cập nhật hồ sơ và bảo mật tài khoản ForRent.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return (
    <PublicShell>
      <div className="flex-grow pt-20">
        <ProfileClient />
      </div>
    </PublicShell>
  );
}
