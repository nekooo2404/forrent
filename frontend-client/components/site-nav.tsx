"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProfileMenu } from "@/components/profile-menu";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export type NavKey = "home" | "rooms" | "blogs" | "contact";

const navItems: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "home", label: "Trang chủ", href: "/homepage" },
  { key: "rooms", label: "Danh sách phòng", href: "/rooms" },
  { key: "blogs", label: "Blog", href: "/blogs" },
  { key: "contact", label: "Liên hệ", href: "/contact" },
];

export function SiteNav({ active }: Readonly<{ active?: NavKey }>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useFocusTrap<HTMLDivElement>(isMobileMenuOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("mobile-menu-open");
    } else {
      document.body.classList.remove("mobile-menu-open");
    }
    return () => {
      document.body.classList.remove("mobile-menu-open");
    };
  }, [isMobileMenuOpen]);

  function closeMenu({ restoreFocus = true } = {}) {
    setIsMobileMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <nav aria-label="Điều hướng chính" data-ready={mounted ? "true" : "false"} data-testid="site-nav" className={`fixed top-0 z-50 w-full transition-colors duration-200 ${
        scrolled
          ? "site-navbar-scrolled"
          : "site-navbar"
      }`}>
      <div className={`relative mx-auto flex max-w-container-max items-center justify-between px-margin-mobile transition-[height] duration-200 md:px-margin-desktop lg:grid lg:grid-cols-[1fr_auto_1fr] ${scrolled ? "h-16" : "h-16 lg:h-20"}`}>
        <Link
          aria-label="ForRent - Trang chủ"
          className={`site-logo-container group relative z-10 inline-flex shrink-0 items-center transition-[width,height] duration-200 ${scrolled ? "h-10 w-32" : "h-10 w-32 lg:h-11 lg:w-[142px]"}`}
          href="/homepage"
        >
          <div className="relative">
            <Image
              alt="ForRent"
              className="h-full w-full object-contain object-left transition-opacity duration-200 group-hover:opacity-90"
              height={241}
              priority
              sizes="(min-width: 768px) 158px, 142px"
              src="/brand/forrent-logo.png"
              width={760}
            />
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              aria-current={item.key === active ? "page" : undefined}
              className={`site-nav-pill ${
                item.key === active ? "site-nav-pill-active" : ""
              }`}
              href={item.href}
              key={item.key}
            >
              <span className="relative z-10 font-body-md text-sm font-semibold">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-4 lg:justify-self-end">
          <button
            aria-expanded={isMobileMenuOpen}
            aria-label="Menu"
            className="site-menu-button lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            ref={menuButtonRef}
            type="button"
          >
            <Menu size={24} strokeWidth={2} />
          </button>

          <div className="site-button-shell hidden lg:block">
            <ProfileMenu />
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
          <div
            aria-label="Menu chính"
            aria-modal="true"
            className="site-mobile-menu"
            ref={mobileMenuRef}
            role="dialog"
          >
            <div className="relative z-10 flex h-16 items-center justify-between border-b border-outline-variant/20 px-margin-mobile">
              <Link
                aria-label="ForRent - Trang chủ"
                className="site-logo-container inline-flex h-10 w-32 shrink-0 items-center"
                href="/homepage"
                onClick={() => closeMenu({ restoreFocus: false })}
              >
                <Image
                  alt="ForRent"
                  className="h-full w-full object-contain object-left"
                  height={241}
                  priority
                  sizes="142px"
                  src="/brand/forrent-logo.png"
                  width={760}
                />
              </Link>
              <button
                aria-label="Đóng menu"
                className="site-close-button"
                onClick={() => closeMenu()}
                type="button"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <nav
              aria-label="Điều hướng trên thiết bị di động"
              className="relative z-10 flex flex-1 flex-col gap-1 p-4"
            >
              {navItems.map((item) => (
                <div key={item.key}>
                  <Link
                    aria-current={item.key === active ? "page" : undefined}
                    className={`site-mobile-link ${
                      item.key === active ? "site-mobile-link-active" : ""
                    }`}
                    href={item.href}
                    onClick={() => closeMenu({ restoreFocus: false })}
                  >
                    <span className="relative z-10 font-body-md text-lg font-semibold">
                      {item.label}
                    </span>
                    {item.key === active ? <span className="ml-auto h-5 w-1 rounded bg-primary" /> : null}
                  </Link>
                </div>
              ))}
            </nav>

            <div className="site-mobile-profile">
              <div className="site-profile-card w-full">
                <ProfileMenu />
              </div>
            </div>
          </div>
      ) : null}
    </nav>
  );
}
