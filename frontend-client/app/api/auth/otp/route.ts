import { NextResponse } from "next/server";

import { ApiError, requestOtp, type OTPRequestPayload } from "@/lib/api";

export async function POST(request: Request) {
  const payload = (await request.json()) as OTPRequestPayload;

  try {
    const data = await requestOtp(payload, request.headers.get("authorization"));
    return NextResponse.json({ success: true, message: "Mã OTP đã được gửi.", data });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
      { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể gửi OTP lúc này.", errors: {} },
      { status: 500 },
    );
  }
}
