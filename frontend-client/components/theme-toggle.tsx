"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-10" />;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-outline-variant/20 bg-surface-container-low p-1">
      <button
        aria-label="Light mode"
        className={`inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded transition-colors ${
          theme === "light"
            ? "bg-primary text-on-primary"
            : "text-on-surface-variant hover:bg-surface-container"
        }`}
        onClick={() => setTheme("light")}
        type="button"
      >
        <Sun size={18} strokeWidth={1.8} />
      </button>
      <button
        aria-label="Dark mode"
        className={`inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded transition-colors ${
          theme === "dark"
            ? "bg-primary text-on-primary"
            : "text-on-surface-variant hover:bg-surface-container"
        }`}
        onClick={() => setTheme("dark")}
        type="button"
      >
        <Moon size={18} strokeWidth={1.8} />
      </button>
      <button
        aria-label="System theme"
        className={`inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded transition-colors ${
          theme === "system"
            ? "bg-primary text-on-primary"
            : "text-on-surface-variant hover:bg-surface-container"
        }`}
        onClick={() => setTheme("system")}
        type="button"
      >
        <Monitor size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
