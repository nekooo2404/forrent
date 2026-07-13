import type { ComponentPropsWithoutRef } from "react";

export function MotionPage({ children, className = "", ...props }: ComponentPropsWithoutRef<"main">) {
  return (
    <main className={className} {...props}>
      {children}
    </main>
  );
}

export function MotionSection({ children, className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={`scroll-reveal ${className}`} {...props}>
      {children}
    </div>
  );
}
