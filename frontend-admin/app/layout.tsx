import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurelian Admin",
  description: "Cổng quản trị Aurelian Reserve cho phòng, lead, hoa hồng và cấu hình hệ thống.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className="light" lang="vi">
      <body className={`${inter.variable} ${playfair.variable} bg-surface font-body-md text-body-md text-on-surface antialiased`}>
        {children}
      </body>
    </html>
  );
}
