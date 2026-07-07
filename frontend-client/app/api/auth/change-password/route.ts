import { NextResponse } from "next/server";

import { ApiError, changePassword, type ChangePasswordPayload } from "@/lib/api";
import { getAccessAuthorization } from "@/lib/server-auth";

export async function POST(request: Request) {
  const payload = (await request.json()) as ChangePasswordPayload;

  try {
    const data = await changePassword(payload, getAccessAuthorization(request));
    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công.", data });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể đổi mật khẩu lúc này.", errors: {} },
      { status: 500 },
    );
  }
}
