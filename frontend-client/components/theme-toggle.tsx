"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ compact = false }: Readonly<{ compact?: boolean }>) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (compact) {
    const isDark = resolvedTheme === "dark";
    const Icon = isDark ? Sun : Moon;
    const label = isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";

    return (
      <button
        aria-label={label}
        className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/60 bg-surface-container-lowest/90 text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-container"
        data-theme-toggle="compact"
        data-testid="theme-compact-toggle"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={label}
        type="button"
      >
        <Icon size={18} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="genz-theme-toggle" data-testid="theme-toggle">
      <button
        aria-label="Light mode"
        className={`genz-theme-button ${theme === "light" ? "genz-theme-button-active" : ""}`}
        data-testid="theme-light"
        onClick={() => setTheme("light")}
        type="button"
      >
        <Sun size={18} strokeWidth={2} />
      </button>
      <button
        aria-label="Dark mode"
        className={`genz-theme-button ${theme === "dark" ? "genz-theme-button-active" : ""}`}
        data-testid="theme-dark"
        onClick={() => setTheme("dark")}
        type="button"
      >
        <Moon size={18} strokeWidth={2} />
      </button>
      <button
        aria-label="System theme"
        className={`genz-theme-button ${theme === "system" ? "genz-theme-button-active" : ""}`}
        data-testid="theme-system"
        onClick={() => setTheme("system")}
        type="button"
      >
        <Monitor size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
