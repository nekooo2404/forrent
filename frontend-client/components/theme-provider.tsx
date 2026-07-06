"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Script to prevent flash of unstyled content (FOUC)
const themeScript = `
(function() {
  try {
    const theme = localStorage.getItem('theme') || 'system';
    let resolved = 'light';

    if (theme === 'dark') {
      resolved = 'dark';
    } else if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove("light", "dark");

    // Resolve theme
    let resolved: "light" | "dark" = "light";

    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = theme;
    }

    // Apply theme with transition
    root.style.transition = "background-color 0.25s ease, color 0.25s ease";
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
    setResolvedTheme(resolved);

    // Save to localStorage
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // Handle quota exceeded or blocked localStorage
      console.warn("Failed to save theme preference:", e);
    }

    // Clean up transition after it completes
    const timer = setTimeout(() => {
      root.style.transition = "";
    }, 300);

    return () => clearTimeout(timer);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      const resolved = e.matches ? "dark" : "light";
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <>
      {/* Inline script to prevent FOUC */}
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
        {children}
      </ThemeContext.Provider>
    </>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
