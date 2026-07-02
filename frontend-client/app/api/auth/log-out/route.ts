import { NextResponse } from "next/server";

import { ApiError, logoutTenant } from "@/lib/api";

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

function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(refreshCookieName, "", {
    httpOnly: true,
    maxAge: 0,
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
    const data = await logoutTenant(refresh, request.headers.get("authorization"));
    const response = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công.",
      data,
    });
    clearRefreshCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      const response = NextResponse.json(
        {
          success: false,
          message: error.message,
          errors: error.errors,
        },
        { status: error.status || 500 },
      );
      clearRefreshCookie(response);
      return response;
    }

    const response = NextResponse.json(
      {
        success: false,
        message: "Không thể đăng xuất lúc này.",
        errors: {},
      },
      { status: 500 },
    );
    clearRefreshCookie(response);
    return response;
  }
}
