"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  theme: Theme;
}

const STORAGE_KEY = "forrent-admin-theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}") || "system";
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = stored === "dark" || (stored === "system" && prefersDark) ? "dark" : "light";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (error) {}
})();
`;

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeProvider({ children, nonce }: Readonly<{ children: ReactNode; nonce?: string }>) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEY);
      if (isTheme(storedTheme)) {
        setTheme(storedTheme);
      }
    } catch {
      // Ignore blocked storage; the current session can still use system theme.
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const resolved = resolveTheme(theme);

    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
    setResolvedTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore blocked storage; theme still applies for the active session.
    }
  }, [mounted, theme]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolved = resolveTheme("system");
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
      document.documentElement.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [mounted, theme]);

  const value = useMemo(() => ({ resolvedTheme, setTheme, theme }), [resolvedTheme, theme]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} nonce={nonce} />
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }
  return context;
}
