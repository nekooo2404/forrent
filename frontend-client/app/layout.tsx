import type { Metadata } from "next";
import { headers } from "next/headers";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

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
  manifest: "/manifest.webmanifest",
  title: {
    default: "ForRent - Thuê phòng theo tháng tại Hà Nội",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/brand/forrent-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/forrent-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/forrent-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
    url: "/",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dynamic rendering lets Next attach the per-request CSP nonce to framework scripts.
  await headers();

  return (
    <html className="light" lang="vi" suppressHydrationWarning>
      <head>
        <link href="https://res.cloudinary.com" rel="preconnect" />
        <link href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"} rel="preconnect" />
      </head>
      <body className={`${openSans.variable} bg-surface font-sans text-body-md text-on-surface antialiased`}>
        <a className="skip-link" href="#main-content">
          Bỏ qua điều hướng
        </a>
        <ToastProvider>
          <div>{children}</div>
        </ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
