import { NextResponse } from "next/server";

import { ApiError, loginTenant, type LoginPayload } from "@/lib/api";
import { parseJsonRequest } from "@/lib/server-request";
import { setSessionCookies } from "@/lib/server-auth";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest<LoginPayload>(request);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  try {
    const data = await loginTenant(payload);
    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công.",
      data: {
        user: data.user,
      },
    });
    setSessionCookies(response, { access: data.access, refresh: data.refresh });
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
