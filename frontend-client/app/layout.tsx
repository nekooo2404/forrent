import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ForRent - Thuê Phòng Theo Tháng",
  description: "Tìm phòng thuê theo tháng theo khu vực, giá, diện tích, loại phòng và đặt lịch xem trực tiếp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="light" lang="vi">
      <head>
        <link href="https://lh3.googleusercontent.com" rel="preconnect" />
        <link href="https://images.unsplash.com" rel="preconnect" />
        <link href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"} rel="preconnect" />
      </head>
      <body className={`${openSans.variable} bg-surface font-body-md text-body-md text-on-surface antialiased`}>
        {children}
      </body>
    </html>
  );
}
