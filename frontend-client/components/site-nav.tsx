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
    <nav className="glass-panel fixed top-0 z-50 w-full border-b border-outline-variant/10">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link aria-label="ForRent - Trang chủ" className="inline-flex h-11 w-[142px] shrink-0 items-center md:h-12 md:w-[158px]" href="/homepage">
          <Image
            alt="ForRent"
            className="h-full w-full object-contain object-left"
            height={241}
            priority
            sizes="(min-width: 768px) 158px, 142px"
            src="/brand/forrent-logo.png"
            width={760}
          />
        </Link>

        <div className="hidden items-center gap-8 font-body-md text-body-md tracking-wide md:flex">
          {navItems.map((item) => (
            <Link
              aria-current={item.key === active ? "page" : undefined}
              className={
                item.key === active
                  ? "nav-link pb-1 text-primary transition-opacity duration-300 hover:opacity-70"
                  : "nav-link text-secondary transition-colors duration-300 hover:text-primary hover:opacity-70"
              }
              href={item.href}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-primary md:gap-4">
          <ThemeToggle />
          <button
            aria-expanded={isMobileMenuOpen}
            aria-label="Menu"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors hover:bg-surface-container md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
          >
            <Menu size={24} strokeWidth={1.8} />
          </button>
          <ProfileMenu />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-surface-container-lowest"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header with close button */}
            <div className="flex h-20 items-center justify-between border-b border-outline-variant/10 px-margin-mobile">
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
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-primary transition-colors hover:bg-surface-container"
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
              >
                <X size={24} strokeWidth={1.8} />
              </button>
            </div>

            {/* Navigation items */}
            <motion.nav
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col p-6"
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
                    className={`block min-h-[44px] border-b border-outline-variant/10 py-4 font-body-md text-lg transition-colors ${
                      item.key === active ? "font-semibold text-primary" : "text-secondary hover:text-primary"
                    }`}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>

            {/* Profile section at bottom */}
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute bottom-6 left-6 right-6"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="rounded-lg border border-outline-variant/10 bg-surface-container-low/50 p-4">
                <ProfileMenu />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
