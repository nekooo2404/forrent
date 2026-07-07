import { NextResponse } from "next/server";

import { ApiError, logoutTenant } from "@/lib/api";
import { clearSessionCookies, getAccessAuthorization, readRefreshCookie } from "@/lib/server-auth";

export async function POST(request: Request) {
  const refresh = readRefreshCookie(request);

  if (!refresh) {
    const response = NextResponse.json(
      {
        success: true,
        message: "Đăng xuất thành công.",
        data: {},
      },
    );
    clearSessionCookies(response);
    return response;
  }

  try {
    const data = await logoutTenant(refresh, getAccessAuthorization(request));
    const response = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công.",
      data,
    });
    clearSessionCookies(response);
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
      clearSessionCookies(response);
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
    clearSessionCookies(response);
    return response;
  }
}
