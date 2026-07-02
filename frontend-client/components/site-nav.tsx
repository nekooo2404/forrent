import Link from "next/link";

import { ProfileMenu } from "@/components/profile-menu";

type NavKey = "home" | "rooms" | "blogs" | "contact";

const navItems: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "home", label: "Trang chủ", href: "/homepage" },
  { key: "rooms", label: "Danh sách phòng", href: "/rooms" },
  { key: "blogs", label: "Blog", href: "/blogs" },
  { key: "contact", label: "Liên hệ", href: "/contact" },
];

export function SiteNav({ active }: Readonly<{ active?: NavKey }>) {
  return (
    <nav className="glass-panel spotlight-card fixed top-0 z-50 w-full border-b border-outline-variant/10">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link className="shine-link font-headline-sm text-headline-sm uppercase tracking-normal text-primary" href="/homepage">
          FORRENT
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
          <ProfileMenu />
        </div>
      </div>
      <div className="border-t border-outline-variant/10 px-margin-mobile pb-3 md:hidden">
        <div className="mx-auto flex max-w-container-max items-center gap-5 overflow-x-auto text-sm text-secondary">
          {navItems.map((item) => (
            <Link
              aria-current={item.key === active ? "page" : undefined}
              className={item.key === active ? "shrink-0 py-2 font-semibold text-primary" : "shrink-0 py-2 transition-colors hover:text-primary"}
              href={item.href}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
