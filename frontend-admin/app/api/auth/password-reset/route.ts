import { NextResponse } from "next/server";

import { ApiError, requestPasswordReset, type PasswordResetRequestPayload } from "@/lib/api";
import { parseJsonRequest } from "@/lib/server-request";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest<PasswordResetRequestPayload>(request);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  try {
    const data = await requestPasswordReset(payload);
    return NextResponse.json({
      success: true,
      message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.",
      data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể gửi yêu cầu đặt lại mật khẩu lúc này.", errors: {} },
      { status: 500 },
    );
  }
}
