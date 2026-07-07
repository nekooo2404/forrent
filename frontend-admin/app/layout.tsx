import type { Metadata } from "next";
import { headers } from "next/headers";
import { Open_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ForRent Admin",
  description: "Cổng quản trị ForRent cho phòng, lead, hoa hồng và cấu hình hệ thống.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html className="light" lang="vi" suppressHydrationWarning>
      <body className={`${openSans.variable} bg-surface font-body-md text-body-md text-on-surface antialiased`}>
        <ThemeProvider nonce={nonce}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
