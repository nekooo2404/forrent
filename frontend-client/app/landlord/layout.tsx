import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LandlordPortalShell } from "@/components/landlord/landlord-portal-shell";

export const metadata: Metadata = {
  title: "Quản lý cho thuê - ForRent",
  description: "Theo dõi phòng, lịch xem và yêu cầu thuê thuộc tài khoản của bạn.",
  robots: { index: false, follow: false },
};

export default function LandlordLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <LandlordPortalShell>{children}</LandlordPortalShell>;
}
