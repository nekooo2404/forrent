"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";

type NavKey = "home" | "rooms" | "blogs" | "contact";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect scroll for glass effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Body scroll lock when mobile menu is open
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

  // Close menu on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <nav aria-label="Điều hướng chính" data-ready={mounted ? "true" : "false"} data-testid="site-nav" className={`fixed top-0 z-50 w-full transition-all duration-500 ${
      scrolled
        ? "site-navbar-scrolled"
        : "site-navbar"
    }`}>
      <div className="site-navbar-gradient" />

      <div className="relative mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:h-24 md:px-margin-desktop">
        <Link
          aria-label="ForRent - Trang chủ"
          className="site-logo-container group relative z-10"
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

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              aria-current={item.key === active ? "page" : undefined}
              className={`site-nav-pill ${
                item.key === active ? "site-nav-pill-active" : ""
              }`}
              href={item.href}
              key={item.key}
            >
              <span className="site-nav-pill-bg" />
              <span className="relative z-10 font-body-md text-sm font-semibold tracking-wide">
                {item.label}
              </span>
              {item.key === active && (
                <span className="site-nav-pill-indicator" />
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="site-button-shell hidden sm:block">
            <ThemeToggle />
          </div>
          <div className="site-button-shell sm:hidden">
            <ThemeToggle compact />
          </div>

          <button
            aria-expanded={isMobileMenuOpen}
            aria-label="Menu"
            className="site-menu-button md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
          >
            <Menu size={24} strokeWidth={2} />
          </button>

          <div className="site-button-shell">
            <ProfileMenu />
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
          <div className="site-mobile-menu scroll-reveal">
            <div className="site-mobile-gradient" />

            <div className="relative z-10 flex h-20 items-center justify-between border-b border-outline-variant/20 px-margin-mobile backdrop-blur-xl">
              <Link
                aria-label="ForRent - Trang chủ"
                className="site-logo-container inline-flex h-11 w-[142px] shrink-0 items-center"
                href="/homepage"
                onClick={() => setIsMobileMenuOpen(false)}
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
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <nav
              aria-label="Điều hướng trên thiết bị di động"
              className="relative z-10 flex flex-col gap-2 p-6 pb-44"
            >
              {navItems.map((item) => (
                <div key={item.key}>
                  <Link
                    aria-current={item.key === active ? "page" : undefined}
                    className={`site-mobile-link ${
                      item.key === active ? "site-mobile-link-active" : ""
                    }`}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="site-mobile-link-bg" />
                    <span className="relative z-10 font-body-md text-lg font-semibold">
                      {item.label}
                    </span>
                    {item.key === active ? <span className="ml-auto size-2 rounded-full bg-primary" /> : null}
                  </Link>
                </div>
              ))}
            </nav>

            <div className="site-mobile-profile">
              <ThemeToggle />
              <div className="site-profile-card">
                <ProfileMenu />
              </div>
            </div>
          </div>
      ) : null}
    </nav>
  );
}
