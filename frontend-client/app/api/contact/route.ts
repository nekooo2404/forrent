import { NextResponse } from "next/server";

import { ApiError, submitContact, type ContactPayload } from "@/lib/api";

export async function POST(request: Request) {
  const payload = (await request.json()) as ContactPayload;

  try {
    const data = await submitContact(payload);
    return NextResponse.json(
      {
        success: true,
        message: "Contact message sent successfully.",
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
        message: "Không thể gửi yêu cầu lúc này.",
        errors: {},
      },
      { status: 500 },
    );
  }
}
