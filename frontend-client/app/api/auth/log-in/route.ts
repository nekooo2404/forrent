import { NextResponse } from "next/server";

import { ApiError, loginTenant, type LoginPayload } from "@/lib/api";

export async function POST(request: Request) {
  const payload = (await request.json()) as LoginPayload;

  try {
    const data = await loginTenant(payload);
    return NextResponse.json({
      success: true,
      message: "Đăng nhập thành công.",
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
        message: "Không thể đăng nhập lúc này.",
        errors: {},
      },
      { status: 500 },
    );
  }
}
