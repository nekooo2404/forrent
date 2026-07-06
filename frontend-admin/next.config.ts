import type { NextConfig } from "next";

const supabaseHost = "rwblwugksbwnkzuakgcf.supabase.co";
const cloudinaryHost = "res.cloudinary.com";
const productionApiOrigin = "https://api.forrent.io.vn";
const isProduction = process.env.NODE_ENV === "production";

function getOrigin(value = productionApiOrigin) {
  try {
    return new URL(value).origin;
  } catch {
    return productionApiOrigin;
  }
}

const apiOrigin = getOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);
const localApiSources = ["http://localhost:8000", "http://127.0.0.1:8000", "http://backend:8000"];
const runtimeApiSources = [apiOrigin, ...(!isProduction ? localApiSources : [])].join(" ");
const imageSources = [
  "'self'",
  "data:",
  "blob:",
  "https://lh3.googleusercontent.com",
  "https://images.unsplash.com",
  `https://${supabaseHost}`,
  `https://${cloudinaryHost}`,
  apiOrigin,
  ...(!isProduction ? localApiSources : []),
].join(" ");

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
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src ${imageSources}`,
      `connect-src 'self' ${runtimeApiSources}`,
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  },
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
