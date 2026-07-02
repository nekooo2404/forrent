import { NextResponse } from "next/server";

import { ApiError, loginTenant, type LoginPayload } from "@/lib/api";

const refreshCookieName = "forrent_refresh";

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
  const payload = (await request.json()) as LoginPayload;

  try {
    const data = await loginTenant(payload);
    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công.",
      data: {
        access: data.access,
        user: data.user,
      },
    });
    if (data.refresh) {
      setRefreshCookie(response, data.refresh);
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          errors: error.errors,
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Không thể đăng nhập lúc này.",
        errors: {},
      },
      { status: 500 },
    );
  }
}
