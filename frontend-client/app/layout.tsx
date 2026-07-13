import type { Metadata } from "next";
import { headers } from "next/headers";
import { Open_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Per-request CSP nonces keep HTML dynamic; public API data is revalidated in lib/api.ts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html className="light" lang="vi" suppressHydrationWarning>
      <head>
        <Script nonce={nonce} src="/theme-init.js" strategy="beforeInteractive" />
        <link href="https://res.cloudinary.com" rel="preconnect" />
        <link href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"} rel="preconnect" />
      </head>
      <body className={`${openSans.variable} bg-surface font-sans text-body-md text-on-surface antialiased`}>
        <a className="skip-link" href="#main-content">
          Bỏ qua điều hướng
        </a>
        <ThemeProvider>
          <ToastProvider>
            <div>{children}</div>
          </ToastProvider>
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
