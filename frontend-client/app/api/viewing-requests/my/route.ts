import { NextResponse } from "next/server";

import { ApiError, getMyViewingRequests } from "@/lib/api";
import { getAccessAuthorization } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const data = await getMyViewingRequests(getAccessAuthorization(request));
    return NextResponse.json({ success: true, message: "Success", data });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Không thể tải lịch xem phòng của bạn.", errors: {} },
      { status: 500 },
    );
  }
}
