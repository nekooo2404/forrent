import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  // Enable JIT mode for faster builds
  mode: "jit",
  theme: {
    extend: {
      colors: {
        "surface-container-low": "#f1f5f9",
        "on-secondary-fixed": "#0f172a",
        "on-tertiary": "#ffffff",
        "primary-fixed": "#dbeafe",
        "tertiary-container": "#cffafe",
        "inverse-on-surface": "#f8fafc",
        secondary: "#334155", // Improved contrast from #475569
        "on-primary-fixed-variant": "#1e3a8a",
        primary: "#2563eb",
        "secondary-fixed-dim": "#cbd5e1",
        "surface-container-high": "#e2e8f0",
        "on-tertiary-fixed": "#164e63",
        "on-secondary": "#ffffff",
        "primary-fixed-dim": "#bfdbfe",
        "on-primary": "#ffffff",
        error: "#dc2626",
        "on-surface-variant": "#334155",
        "inverse-surface": "#0f172a",
        "primary-container": "#dbeafe",
        "on-error-container": "#991b1b",
        "surface-container-highest": "#cbd5e1",
        "surface-container-lowest": "#ffffff",
        "surface-dim": "#e2e8f0",
        "inverse-primary": "#bfdbfe",
        "on-error": "#ffffff",
        "tertiary-fixed-dim": "#a5f3fc",
        background: "#f8fafc",
        outline: "#64748b",
        "on-tertiary-container": "#164e63",
        tertiary: "#0891b2",
        "tertiary-fixed": "#cffafe",
        "on-secondary-container": "#334155",
        "on-primary-fixed": "#1e3a8a",
        "on-secondary-fixed-variant": "#475569",
        "surface-tint": "#1d4ed8",
        "outline-variant": "#cbd5e1",
        "surface-bright": "#ffffff",
        "on-surface": "#0f172a",
        "error-container": "#fee2e2",
        "surface-variant": "#e2e8f0",
        "surface-container": "#e2e8f0",
        "secondary-container": "#e2e8f0",
        surface: "#f8fafc",
        "secondary-fixed": "#e2e8f0",
        "on-tertiary-fixed-variant": "#155e75",
        "on-background": "#0f172a",
        "on-primary-container": "#1e3a8a",
        success: "#16a34a",
        "on-success": "#ffffff",
        "success-container": "#dcfce7",
        warning: "#eab308",
        "on-warning": "#0f172a",
        "warning-container": "#fef9c3",
        gold: "#f97316",
      },
      spacing: {
        "margin-mobile": "16px",
        "margin-desktop": "24px",
      },
      fontFamily: {
        sans: ["var(--font-open-sans)", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["58px", { lineHeight: "1.0", fontWeight: "800" }],
        button: ["15px", { lineHeight: "1.0", letterSpacing: "0.05em", fontWeight: "500" }],
        "headline-sm": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-md": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "display-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1.0", letterSpacing: "0.1em", fontWeight: "600" }],
      },
      maxWidth: {
        "container-max": "1280px",
      },
      boxShadow: {
        low: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.08)",
        medium: "0 8px 24px rgba(15,23,42,0.10)",
        high: "0 18px 48px rgba(15,23,42,0.14)",
        soft: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.08)",
        elevated: "0 8px 24px rgba(15,23,42,0.10)",
      },
    },
  },
  // Enable future flags for performance
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.touch-target': {
          minWidth: '44px',
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      });
    }),
  ],
};

export default config;
