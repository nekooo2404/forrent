import type { ComponentPropsWithoutRef, ReactNode } from "react";

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

export function MotionList({ children, className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={`scroll-reveal ${className}`} {...props}>
      {children}
    </div>
  );
}

export function MotionItem({ children, className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function MotionModal({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">{children}</div>;
}
