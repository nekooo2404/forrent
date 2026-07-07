import type { NextConfig } from "next";

const supabaseHost = "rwblwugksbwnkzuakgcf.supabase.co";
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
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.forrent.io.vn",
      },
      {
        protocol: "https",
        hostname: supabaseHost,
      },
      {
        protocol: "https",
        hostname: cloudinaryHost,
      },
      ...(!isProduction ? localImageRemotePatterns : []),
    ],
  },
};

export default nextConfig;
