import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";
import { getAccessAuthorization } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxyAdminRequest(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/admin/${path.map(encodeURIComponent).join("/")}/`, API_BASE_URL);

  incomingUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const headers = new Headers({ Accept: "application/json", "X-Forwarded-Proto": "https" });
  const authorization = getAccessAuthorization(request);
  const contentType = request.headers.get("content-type");

  if (authorization) {
    headers.set("Authorization", authorization);
  }

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.arrayBuffer();
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
  }

  try {
    const response = await fetch(targetUrl, {
      body,
      cache: "no-store",
      headers,
      method: request.method,
    });

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Không thể kết nối hệ thống quản trị.",
        errors: {},
      },
      { status: 502 },
    );
  }
}

export const GET = proxyAdminRequest;
export const POST = proxyAdminRequest;
export const PUT = proxyAdminRequest;
export const PATCH = proxyAdminRequest;
export const DELETE = proxyAdminRequest;
