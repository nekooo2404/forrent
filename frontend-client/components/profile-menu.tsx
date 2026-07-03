"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  clearAuthSession,
  getStoredAccessToken,
  hasStoredAuthSession,
  refreshStoredAuthSession,
} from "@/lib/auth-storage";

export function ProfileMenu() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasStoredAuthSession());
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getStoredAccessToken()) {
      refreshStoredAuthSession()
        .then((token) => setIsLoggedIn(Boolean(token)))
        .catch(() => setIsLoggedIn(false));
    }

    function refreshAuthState() {
      setIsLoggedIn(hasStoredAuthSession());
    }

    window.addEventListener("storage", refreshAuthState);
    window.addEventListener("focus", refreshAuthState);

    return () => {
      window.removeEventListener("storage", refreshAuthState);
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
    const accessToken = getStoredAccessToken();

    await fetch("/api/auth/log-out", {
      body: JSON.stringify({}),
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch(() => null);

    clearAuthSession();
    setIsLoggedIn(false);
    setIsProfileMenuOpen(false);
    window.location.assign("/homepage");
  }

  return (
    <div className="relative z-[60] ml-1" ref={profileMenuRef}>
      <button
        aria-expanded={isProfileMenuOpen}
        aria-haspopup="menu"
        aria-label="Tài khoản"
        className="premium-button inline-flex size-10 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-lowest text-primary"
        onClick={() => setIsProfileMenuOpen((current) => !current)}
        type="button"
      >
        <UserRound aria-hidden="true" size={22} strokeWidth={1.8} />
      </button>

      {isProfileMenuOpen ? (
        <div
          className="glass-panel scroll-reveal absolute right-0 top-full z-[60] mt-3 w-52 overflow-hidden rounded-lg border py-2 text-left"
          role="menu"
        >
          {isLoggedIn ? (
            <>
              <Link
                className="block px-4 py-3 font-body-md text-body-md text-primary transition-colors hover:bg-surface-container"
                href="/profile"
                onClick={() => setIsProfileMenuOpen(false)}
                role="menuitem"
              >
                Thông tin người dùng
              </Link>
              <Link
                className="block px-4 py-3 font-body-md text-body-md text-primary transition-colors hover:bg-surface-container"
                href="/forget-password"
                onClick={() => setIsProfileMenuOpen(false)}
                role="menuitem"
              >
                Quên mật khẩu
              </Link>
              <button
                className="block w-full px-4 py-3 text-left font-body-md text-body-md text-primary transition-colors hover:bg-surface-container"
                onClick={handleLogout}
                role="menuitem"
                type="button"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              className="block px-4 py-3 font-body-md text-body-md text-primary transition-colors hover:bg-surface-container"
              href="/log-in"
              onClick={() => setIsProfileMenuOpen(false)}
              role="menuitem"
            >
              Đăng nhập/ Đăng kí
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
