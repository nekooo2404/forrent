"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-[120px] items-center gap-1 rounded-xl border border-outline-variant/20 bg-surface-container-low/50 p-1" />
    );
  }

  return (
    <div className="genz-theme-toggle">
      <button
        aria-label="Light mode"
        className={`genz-theme-button ${theme === "light" ? "genz-theme-button-active" : ""}`}
        onClick={() => setTheme("light")}
        type="button"
      >
        <Sun size={18} strokeWidth={2} />
      </button>
      <button
        aria-label="Dark mode"
        className={`genz-theme-button ${theme === "dark" ? "genz-theme-button-active" : ""}`}
        onClick={() => setTheme("dark")}
        type="button"
      >
        <Moon size={18} strokeWidth={2} />
      </button>
      <button
        aria-label="System theme"
        className={`genz-theme-button ${theme === "system" ? "genz-theme-button-active" : ""}`}
        onClick={() => setTheme("system")}
        type="button"
      >
        <Monitor size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
