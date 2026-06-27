import Link from "next/link";
import { Heart, Search, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";

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
    <nav className="fixed top-0 z-50 w-full border-b border-outline-variant/10 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link className="font-headline-sm text-headline-sm uppercase tracking-normal text-primary" href="/homepage">
          AURELIAN RESERVE
        </Link>

        <div className="hidden items-center gap-8 font-body-md text-body-md tracking-wide md:flex">
          {navItems.map((item) => (
            <Link
              className={
                item.key === active
                  ? "border-b border-primary pb-1 text-primary transition-opacity duration-300 hover:opacity-70"
                  : "text-secondary transition-colors duration-300 hover:text-primary hover:opacity-70"
              }
              href={item.href}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-primary md:gap-4">
          <NavIconButton label="Tìm kiếm">
            <Search size={21} strokeWidth={1.8} />
          </NavIconButton>
          <NavIconButton label="Yêu thích">
            <Heart size={21} strokeWidth={1.8} />
          </NavIconButton>
          <NavIconButton label="Giỏ hàng">
            <ShoppingBag size={21} strokeWidth={1.8} />
          </NavIconButton>

          <ProfileMenu />
        </div>
      </div>
    </nav>
  );
}

function NavIconButton({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  return (
    <button
      aria-label={label}
      className="inline-flex size-10 items-center justify-center rounded text-primary transition-opacity duration-300 hover:opacity-70 active:translate-y-px"
      type="button"
    >
      {children}
    </button>
  );
}
