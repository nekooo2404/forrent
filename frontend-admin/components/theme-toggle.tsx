"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme-provider";

const options = [
  { icon: Sun, label: "Giao diện sáng", value: "light" },
  { icon: Moon, label: "Giao diện tối", value: "dark" },
  { icon: Monitor, label: "Theo hệ thống", value: "system" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[52px] w-[154px] rounded-md border border-primary/10 bg-surface-container-low" />;
  }

  return (
    <div
      aria-label="Chọn giao diện"
      className="inline-flex min-h-[52px] items-center gap-1 rounded-md border border-primary/10 bg-surface-container-lowest p-1 shadow-sm"
      role="group"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            aria-label={option.label}
            aria-pressed={isActive}
            className={`inline-flex size-11 items-center justify-center rounded text-secondary transition hover:bg-surface-container hover:text-primary ${
              isActive ? "bg-primary text-on-primary shadow-sm hover:bg-primary hover:text-on-primary" : ""
            }`}
            key={option.value}
            onClick={() => setTheme(option.value)}
            type="button"
          >
            <Icon size={16} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
