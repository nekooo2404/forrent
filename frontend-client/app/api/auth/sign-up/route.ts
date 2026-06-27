import { NextResponse } from "next/server";

import { ApiError, registerTenant, type RegisterPayload } from "@/lib/api";

export async function POST(request: Request) {
  const payload = (await request.json()) as RegisterPayload;

  try {
    const data = await registerTenant(payload);
    return NextResponse.json(
      {
        success: true,
        message: "Đăng ký tài khoản thành công.",
        data,
      },
      { status: 201 },
    );
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
        message: "Không thể đăng ký tài khoản lúc này.",
        errors: {},
      },
      { status: 500 },
    );
  }
}
