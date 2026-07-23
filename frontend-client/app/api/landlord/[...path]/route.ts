import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";
import { getAccessAuthorization } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxyLandlordRequest(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/landlord/${path.map(encodeURIComponent).join("/")}/`, API_BASE_URL);

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
        message: "Không thể kết nối khu vực quản lý phòng. Vui lòng thử lại.",
        errors: {},
      },
      { status: 502 },
    );
  }
}

export const GET = proxyLandlordRequest;
export const POST = proxyLandlordRequest;
export const PUT = proxyLandlordRequest;
export const PATCH = proxyLandlordRequest;
export const DELETE = proxyLandlordRequest;
