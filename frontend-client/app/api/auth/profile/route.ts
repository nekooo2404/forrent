import { NextResponse } from "next/server";

import { ApiError, updateProfile, type ProfileUpdatePayload } from "@/lib/api";
import { getAccessAuthorization } from "@/lib/server-auth";

export async function PUT(request: Request) {
  const payload = (await request.json()) as ProfileUpdatePayload;

  try {
    const data = await updateProfile(payload, getAccessAuthorization(request));
    return NextResponse.json({ success: true, message: "Cập nhật thông tin thành công.", data });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật thông tin lúc này.", errors: {} },
      { status: 500 },
    );
  }
}
