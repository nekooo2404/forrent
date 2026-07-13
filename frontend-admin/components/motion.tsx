import type { ComponentPropsWithoutRef } from "react";

export function MotionPage({ children, className = "", ...props }: ComponentPropsWithoutRef<"main">) {
  return (
    <main className={className} {...props}>
      {children}
    </main>
  );
}
