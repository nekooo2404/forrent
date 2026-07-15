import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const cloudinaryHost = "res.cloudinary.com";
const isProduction = process.env.NODE_ENV === "production";

const localImageRemotePatterns = [
  {
    protocol: "http",
    hostname: "localhost",
    port: "8000",
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "8000",
  },
  {
    protocol: "http",
    hostname: "backend",
    port: "8000",
  },
] as const;

const securityHeaders = [
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Performance: Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
    webpackBuildWorker: true,
  },

  // Performance: Compiler options
  compiler: {
    removeConsole: isProduction ? { exclude: ['error', 'warn'] } : false,
  },

  async redirects() {
    return [{ source: "/homepage", destination: "/", permanent: true }];
  },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    deviceSizes: [360, 640, 768, 1024, 1200, 1536],
    formats: ["image/avif", "image/webp"],
    imageSizes: [96, 160, 240, 320, 480],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    qualities: [75, 78, 82],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.forrent.io.vn",
      },
      {
        protocol: "https",
        hostname: cloudinaryHost,
      },
      ...(!isProduction ? localImageRemotePatterns : []),
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
