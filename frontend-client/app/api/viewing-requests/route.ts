import { NextResponse } from "next/server";

import { ApiError, createViewingRequest } from "@/lib/api";
import { getAccessAuthorization } from "@/lib/server-auth";
import { parseJsonRequest } from "@/lib/server-request";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest<{
    room_id?: number;
    preferred_viewing_date?: string;
    preferred_viewing_time_slot?: "morning" | "afternoon" | "evening" | "";
  }>(request);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;
  const roomId = Number(payload.room_id);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Room id không hợp lệ.",
        errors: { room_id: ["Room id không hợp lệ."] },
      },
      { status: 400 },
    );
  }

  try {
    const data = await createViewingRequest(
      {
        room_id: roomId,
        preferred_viewing_date: payload.preferred_viewing_date,
        preferred_viewing_time_slot: payload.preferred_viewing_time_slot,
      },
      getAccessAuthorization(request),
    );
    return NextResponse.json(
      {
        success: true,
        message: "Yêu cầu xem phòng đã được ghi nhận.",
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
        message: "Không thể gửi yêu cầu xem phòng lúc này.",
        errors: {},
      },
      { status: 500 },
    );
  }
}
