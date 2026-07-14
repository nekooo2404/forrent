import type { ComponentPropsWithoutRef } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav, type NavKey } from "@/components/site-nav";

type PublicShellProps = ComponentPropsWithoutRef<"main"> & {
  active?: NavKey;
};

export function PublicShell({ active, children, className = "", ...props }: PublicShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav active={active} />
      <main className={`flex flex-1 flex-col ${className}`} id="main-content" tabIndex={-1} {...props}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
