import { NextResponse } from "next/server";

import { ApiError, refreshTenant } from "@/lib/api";
import { readRefreshCookie, setSessionCookies } from "@/lib/server-auth";

export async function POST(request: Request) {
  const refresh = readRefreshCookie(request);

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
      data: {},
    });
    setSessionCookies(response, { access: data.access, refresh: data.refresh });
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
