import { NextResponse, type NextRequest } from "next/server";

const supabaseHost = "rwblwugksbwnkzuakgcf.supabase.co";
const cloudinaryHost = "res.cloudinary.com";
const productionApiOrigin = "https://api.forrent.io.vn";
const isProduction = process.env.NODE_ENV === "production";

function nonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function origin(value = productionApiOrigin) {
  try {
    return new URL(value).origin;
  } catch {
    return productionApiOrigin;
  }
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestNonce = nonce();
  const apiOrigin = origin(process.env.NEXT_PUBLIC_API_BASE_URL);
  const localApiSources = isProduction ? [] : ["http://localhost:8000", "http://127.0.0.1:8000", "http://backend:8000"];
  const scriptSources = [`'self'`, `'nonce-${requestNonce}'`, "'strict-dynamic'", ...(!isProduction ? ["'unsafe-eval'"] : [])].join(" ");
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    `style-src 'self' 'nonce-${requestNonce}' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: https://lh3.googleusercontent.com https://images.unsplash.com https://${supabaseHost} https://${cloudinaryHost} ${apiOrigin} ${localApiSources.join(" ")}`,
    `connect-src 'self' ${apiOrigin} ${localApiSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");

  requestHeaders.set("x-nonce", requestNonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
