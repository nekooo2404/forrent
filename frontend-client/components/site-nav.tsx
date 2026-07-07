"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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
    <nav data-ready={mounted ? "true" : "false"} data-testid="site-nav" className={`fixed top-0 z-50 w-full transition-all duration-500 ${
      scrolled
        ? "genz-navbar-scrolled"
        : "genz-navbar"
    }`}>
      <div className="genz-navbar-gradient" />

      <div className="relative mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:h-24 md:px-margin-desktop">
        <Link
          aria-label="ForRent - Trang chủ"
          className="genz-logo-container group relative z-10"
          href="/homepage"
        >
          <div className="genz-logo-glow" />
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
              className={`genz-nav-pill ${
                item.key === active ? "genz-nav-pill-active" : ""
              }`}
              href={item.href}
              key={item.key}
            >
              <span className="genz-nav-pill-bg" />
              <span className="relative z-10 font-body-md text-sm font-semibold tracking-wide">
                {item.label}
              </span>
              {item.key === active && (
                <span className="genz-nav-pill-indicator" />
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="genz-button-3d hidden sm:block">
            <ThemeToggle />
          </div>
          <div className="genz-button-3d sm:hidden">
            <ThemeToggle compact />
          </div>

          <button
            aria-expanded={isMobileMenuOpen}
            aria-label="Menu"
            className="genz-menu-button md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
          >
            <span className="genz-button-glow" />
            <Menu size={24} strokeWidth={2} />
          </button>

          <div className="genz-button-3d">
            <ProfileMenu />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="genz-mobile-menu"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="genz-mobile-gradient" />

            <div className="relative z-10 flex h-20 items-center justify-between border-b border-outline-variant/20 px-margin-mobile backdrop-blur-xl">
              <Link
                aria-label="ForRent - Trang chủ"
                className="inline-flex h-11 w-[142px] shrink-0 items-center"
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
                className="genz-close-button"
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
              >
                <span className="genz-button-glow" />
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <motion.nav
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex flex-col gap-2 p-6 pb-44"
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {navItems.map((item, index) => (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  initial={{ opacity: 0, x: -20 }}
                  key={item.key}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.3 }}
                >
                  <Link
                    aria-current={item.key === active ? "page" : undefined}
                    className={`genz-mobile-link ${
                      item.key === active ? "genz-mobile-link-active" : ""
                    }`}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="genz-mobile-link-bg" />
                    <span className="relative z-10 font-body-md text-lg font-semibold">
                      {item.label}
                    </span>
                    {item.key === active ? <span className="ml-auto size-2 rounded-full bg-primary" /> : null}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>

            <motion.div
              animate={{ opacity: 1 }}
              className="genz-mobile-profile"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <ThemeToggle />
              <div className="genz-profile-card">
                <ProfileMenu />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
