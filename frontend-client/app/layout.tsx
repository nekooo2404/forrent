import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
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
  title: "AURELIAN RESERVE - Cho Thuê Sang Trọng",
  description: "Khám phá bộ sưu tập bất động sản cho thuê sang trọng, được tuyển chọn cho người thuê sành điệu.",
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
      <body className={`${inter.variable} ${playfair.variable} bg-surface font-body-md text-body-md text-on-surface antialiased`}>
        {children}
      </body>
    </html>
  );
}
