"use client";

import Link from "next/link";
import { UserRound } from "@/components/ui/icons";
import { useEffect, useRef, useState } from "react";

import {
  clearAuthSession,
  getAuthSession,
} from "@/lib/auth-storage";

type AuthState = "loading" | "anonymous" | "authenticated";

export function ProfileMenu() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function refreshAuthState() {
      try {
        const authenticated = await getAuthSession();
        if (isMounted) {
          setAuthState(authenticated ? "authenticated" : "anonymous");
        }
      } catch {
        if (isMounted) setAuthState("anonymous");
      }
    }

    refreshAuthState();
    window.addEventListener("focus", refreshAuthState);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshAuthState);
    };
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  async function handleLogout() {
    await fetch("/api/auth/log-out", {
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch(() => null);

    clearAuthSession();
    setAuthState("anonymous");
    setIsProfileMenuOpen(false);
    window.location.assign("/");
  }

  if (authState === "loading") {
    return <div aria-hidden="true" className="min-h-11 w-full lg:w-[194px]" />;
  }

  if (authState === "anonymous") {
    return (
      <div
        className="flex min-h-11 w-full items-center justify-end gap-2 lg:w-[194px]"
        data-testid="public-account-actions"
      >
        <Link
          className="inline-flex min-h-11 min-w-[86px] flex-1 items-center justify-center whitespace-nowrap px-2 text-sm font-semibold text-secondary transition-colors hover:text-primary lg:flex-none"
          href="/log-in"
        >
          Đăng nhập
        </Link>
        <Link
          className="inline-flex min-h-11 min-w-[90px] flex-1 items-center justify-center whitespace-nowrap rounded-md border border-primary/45 bg-surface-container-lowest px-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low lg:flex-none"
          href="/sign-up"
        >
          Đăng ký
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-[60] flex min-h-11 w-full justify-end lg:w-[194px]" ref={profileMenuRef}>
      <button
        aria-controls="profile-popover"
        aria-expanded={isProfileMenuOpen}
        aria-label="Tài khoản"
        className="premium-button inline-flex size-11 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-lowest text-primary"
        onClick={() => setIsProfileMenuOpen((current) => !current)}
        type="button"
      >
        <UserRound aria-hidden="true" size={22} strokeWidth={1.8} />
      </button>

      {isProfileMenuOpen ? (
        <div
          className="scroll-reveal absolute right-0 top-full z-[60] mt-3 w-52 overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-2 text-left shadow-high"
          id="profile-popover"
        >
          <Link
            className="block min-h-11 px-4 py-3 font-body-md text-body-md text-primary transition-colors hover:bg-surface-container"
            href="/profile"
            onClick={() => setIsProfileMenuOpen(false)}
          >
            Thông tin người dùng
          </Link>
          <Link
            className="block min-h-11 px-4 py-3 font-body-md text-body-md text-primary transition-colors hover:bg-surface-container"
            href="/forget-password"
            onClick={() => setIsProfileMenuOpen(false)}
          >
            Quên mật khẩu
          </Link>
          <button
            className="block min-h-11 w-full px-4 py-3 text-left font-body-md text-body-md text-primary transition-colors hover:bg-surface-container"
            onClick={handleLogout}
            type="button"
          >
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
