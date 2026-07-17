import { NextResponse } from "next/server";

import { ApiError, confirmPasswordReset, type PasswordResetConfirmPayload } from "@/lib/api";
import { parseJsonRequest } from "@/lib/server-request";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest<PasswordResetConfirmPayload>(request);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  try {
    const data = await confirmPasswordReset(payload);
    return NextResponse.json({ success: true, message: "Đặt lại mật khẩu thành công.", data });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể đặt lại mật khẩu lúc này.", errors: {} },
      { status: 500 },
    );
  }
}
