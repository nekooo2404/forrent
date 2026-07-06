import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const noindex = process.env.NEXT_PUBLIC_NOINDEX === "true";

const openSans = Open_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "ForRent - Thuê phòng theo tháng tại Hà Nội",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
    url: "/homepage",
    title: "ForRent - Thuê phòng theo tháng tại Hà Nội",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "ForRent - Thuê phòng theo tháng tại Hà Nội",
    description: SITE_DESCRIPTION,
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  robots: {
    index: !noindex,
    follow: !noindex,
  },
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
        <link href="https://res.cloudinary.com" rel="preconnect" />
        <link href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"} rel="preconnect" />
      </head>
      <body className={`${openSans.variable} bg-surface font-body-md text-body-md text-on-surface antialiased`}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
