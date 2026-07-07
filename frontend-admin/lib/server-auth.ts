import type { NextResponse } from "next/server";

const accessCookieName = "forrent_admin_access";
const refreshCookieName = "forrent_admin_refresh";
const secure = process.env.NODE_ENV === "production";

function readCookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export function readRefreshCookie(request: Request) {
  return readCookie(request, refreshCookieName);
}

export function getAccessAuthorization(request: Request) {
  const access = readCookie(request, accessCookieName);
  return access ? `Bearer ${access}` : null;
}

export function setSessionCookies(response: NextResponse, tokens: { access?: string; refresh?: string }) {
  if (tokens.access) {
    response.cookies.set(accessCookieName, tokens.access, {
      httpOnly: true,
      maxAge: 55 * 60,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }

  if (tokens.refresh) {
    response.cookies.set(refreshCookieName, tokens.refresh, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [accessCookieName, refreshCookieName]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }
}
