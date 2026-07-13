import { NextResponse } from "next/server";

import { ApiError, getCurrentUser, refreshTenant } from "@/lib/api";
import {
  clearSessionCookies,
  getAccessAuthorization,
  readRefreshCookie,
  setSessionCookies,
} from "@/lib/server-auth";

function anonymousResponse(clearCookies = false) {
  const response = NextResponse.json({
    success: true,
    message: "Success",
    data: { authenticated: false },
  });
  if (clearCookies) clearSessionCookies(response);
  return response;
}

export async function GET(request: Request) {
  const authorization = getAccessAuthorization(request);
  const refresh = readRefreshCookie(request);

  if (!authorization && !refresh) {
    return anonymousResponse();
  }

  if (authorization) {
    try {
      await getCurrentUser(authorization);
      return NextResponse.json({
        success: true,
        message: "Success",
        data: { authenticated: true },
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        return anonymousResponse();
      }
    }
  }

  if (!refresh) {
    return anonymousResponse(true);
  }

  try {
    const tokens = await refreshTenant(refresh);
    await getCurrentUser(`Bearer ${tokens.access}`);
    const response = NextResponse.json({
      success: true,
      message: "Success",
      data: { authenticated: true },
    });
    setSessionCookies(response, tokens);
    return response;
  } catch {
    return anonymousResponse(true);
  }
}
