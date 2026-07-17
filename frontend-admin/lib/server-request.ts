import { NextResponse } from "next/server";

export async function parseJsonRequest<T>(request: Request) {
  try {
    return { ok: true as const, data: (await request.json()) as T };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: "Dữ liệu JSON không hợp lệ.", errors: {} },
        { status: 400 },
      ),
    };
  }
}
