import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LandlordPortalShell } from "@/components/landlord/landlord-portal-shell";

export const metadata: Metadata = {
  title: "Quản trị người dùng - ForRent",
  description: "Khu vực quản trị dành cho người cho thuê trên ForRent.",
  robots: { index: false, follow: false },
};

export default function LandlordLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <LandlordPortalShell>{children}</LandlordPortalShell>;
}
