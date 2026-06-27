import { NextResponse } from "next/server";

import { ApiError, logoutTenant } from "@/lib/api";

export async function POST(request: Request) {
  const payload = (await request.json()) as { refresh?: string };

  if (!payload.refresh) {
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
    const data = await logoutTenant(payload.refresh, request.headers.get("authorization"));
    return NextResponse.json({
      success: true,
      message: "Đăng xuất thành công.",
      data,
    });
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
        message: "Không thể đăng xuất lúc này.",
        errors: {},
      },
      { status: 500 },
    );
  }
}
