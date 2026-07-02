import { NextResponse } from "next/server";

import { ApiError, refreshTenant } from "@/lib/api";

const refreshCookieName = "forrent_refresh";

function readRefreshCookie(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${refreshCookieName}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

function setRefreshCookie(response: NextResponse, refresh: string) {
  response.cookies.set(refreshCookieName, refresh, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { refresh?: string };
  const refresh = payload.refresh || readRefreshCookie(request);

  if (!refresh) {
    return NextResponse.json(
      {
        success: false,
        message: "Refresh token không hợp lệ.",
        errors: { refresh: ["Refresh token không hợp lệ."] },
      },
      { status: 400 },
    );
  }

  try {
    const data = await refreshTenant(refresh);
    const response = NextResponse.json({
      success: true,
      message: "Token refreshed.",
      data: { access: data.access },
    });
    if (data.refresh) {
      setRefreshCookie(response, data.refresh);
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Không thể làm mới phiên đăng nhập.", errors: {} },
      { status: 500 },
    );
  }
}
