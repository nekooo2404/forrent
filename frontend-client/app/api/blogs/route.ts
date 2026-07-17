import { NextResponse } from "next/server";

import { ApiError, createTenantBlog, type TenantBlogPayload } from "@/lib/api";
import { parseJsonRequest } from "@/lib/server-request";
import { getAccessAuthorization } from "@/lib/server-auth";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest<TenantBlogPayload>(request);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  try {
    const data = await createTenantBlog(payload, getAccessAuthorization(request));
    return NextResponse.json(
      { success: true, message: "Bài viết đã được gửi và đang chờ duyệt.", data },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Không thể gửi bài viết lúc này.", errors: {} },
      { status: 500 },
    );
  }
}
