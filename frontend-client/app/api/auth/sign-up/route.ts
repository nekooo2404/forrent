import { NextResponse } from "next/server";

import { ApiError, registerTenant, type RegisterPayload } from "@/lib/api";
import { parseJsonRequest } from "@/lib/server-request";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest<RegisterPayload>(request);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

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
