import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "ForRent Admin",
  description: "Cổng quản trị ForRent cho phòng, lead, hoa hồng và cấu hình hệ thống.",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}
