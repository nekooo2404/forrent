# Dark Mode Implementation Guide

## Overview

Dark mode has been implemented using Tailwind CSS's built-in dark mode support with a custom theme provider.

## Features

- **3 Theme Options:** Light, Dark, System (auto-detect)
- **Persistent:** Theme choice saved to localStorage
- **System Detection:** Automatically follows OS theme preference
- **Smooth Transitions:** No flash on page load
- **Tailwind Integration:** Use `dark:` prefix for dark mode styles

## Usage

### 1. Wrap App with ThemeProvider

Already done in `app/layout.tsx`:

```tsx
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast-provider';

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Add Theme Toggle Component

```tsx
import { ThemeToggle } from '@/components/theme-toggle';

// In your navigation or settings
<ThemeToggle />
```

### 3. Style Components for Dark Mode

Use Tailwind's `dark:` prefix:

```tsx
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  <h1 className="text-primary dark:text-blue-400">Title</h1>
  <p className="text-secondary dark:text-slate-300">Description</p>
</div>
```

## Common Dark Mode Patterns

### Backgrounds
```tsx
className="bg-surface dark:bg-slate-900"
className="bg-surface-container-low dark:bg-slate-800"
className="bg-white dark:bg-slate-900"
```

### Text
```tsx
className="text-on-surface dark:text-slate-100"
className="text-on-surface-variant dark:text-slate-300"
className="text-secondary dark:text-slate-400"
```

### Borders
```tsx
className="border-outline-variant dark:border-slate-700"
className="border-primary/10 dark:border-primary/20"
```

### Cards
```tsx
className="urban-card dark:bg-slate-800 dark:border-slate-700"
```

### Buttons
```tsx
// Primary buttons usually don't need dark variants
className="bg-primary text-on-primary" // Same in both modes

// Secondary buttons
className="border border-primary/10 dark:border-primary/20 bg-white dark:bg-slate-800"
```

## Tailwind Config

Dark mode enabled in `tailwind.config.ts`:

```ts
export default {
  darkMode: "class", // Uses .dark class on <html>
  // ...
}
```

## API

### useTheme Hook

```tsx
import { useTheme } from '@/components/theme-provider';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

## Testing Dark Mode

### Manual Testing
1. Click theme toggle
2. Switch between Light/Dark/System
3. Verify theme persists on page reload
4. Change OS theme (System mode) and verify auto-update

### Browser DevTools
```js
// Test system preference
window.matchMedia('(prefers-color-scheme: dark)').matches
```

## Migration Checklist

To fully support dark mode across the app:

- [ ] Update homepage components
- [ ] Update room listing page
- [ ] Update room detail page
- [ ] Update blog pages
- [ ] Update contact page
- [ ] Update profile page
- [ ] Update modals and overlays
- [ ] Update form inputs
- [ ] Update buttons and CTAs
- [ ] Update empty states
- [ ] Update toast notifications
- [ ] Test all components in both modes
- [ ] Verify color contrast in dark mode (WCAG AA)

## Color Palette (Dark Mode)

```css
/* Dark mode overrides in globals.css */
.dark {
  --background: #0f172a;
  --surface: #0f172a;
  --surface-container-lowest: #1e293b;
  --surface-container-low: #334155;
  --on-surface: #f8fafc;
  --on-surface-variant: #cbd5e1;
}
```

## Performance

- **No Flash:** Theme applied before first paint using inline script
- **localStorage:** Cached theme choice for instant load
- **System Listener:** Efficient event listener for OS preference changes
- **Hydration Safe:** Mounted check prevents hydration mismatches
