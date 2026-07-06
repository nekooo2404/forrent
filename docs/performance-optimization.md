# Performance Optimization Guide

## Implemented Optimizations

### 1. Code Splitting & Lazy Loading

**Next.js Automatic Code Splitting:**
- Each page is automatically code-split
- Only necessary JavaScript is loaded per route

**Dynamic Imports for Heavy Components:**
```tsx
// Example: Lazy load modal components
import dynamic from 'next/dynamic';

const RoomGallery = dynamic(() => import('@/components/room-gallery'), {
  loading: () => <div>Loading gallery...</div>,
  ssr: false, // Disable SSR for client-only components
});
```

**Package Optimization:**
- `lucide-react` and `framer-motion` are optimized via `experimental.optimizePackageImports`
- Tree-shaking enabled for unused exports

### 2. Image Optimization

**Next.js Image Component:**
- AVIF + WebP formats for modern browsers
- Automatic responsive images with `sizes` prop
- 7-day cache TTL for CDN
- Lazy loading by default

**Usage:**
```tsx
<Image
  src="/room.jpg"
  alt="Room"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
  quality={82}
  priority={false} // true for above-the-fold images
/>
```

### 3. CSS Optimization

**Tailwind JIT Mode:**
- Only generates CSS for classes actually used
- Faster build times
- Smaller bundle sizes

**PurgeCSS:**
- Automatically removes unused CSS in production
- Configured in `tailwind.config.ts`

### 4. JavaScript Optimization

**SWC Minification:**
- Enabled via `swcMinify: true`
- Faster than Terser
- Better compression

**Console Removal:**
- `console.log` removed in production
- `console.error` and `console.warn` preserved

**Webpack Build Workers:**
- Parallel compilation with `webpackBuildWorker: true`
- Faster build times

### 5. Runtime Performance

**React Strict Mode:**
- Enabled for development debugging
- Catches potential issues early

**Font Optimization:**
- `Open_Sans` loaded via `next/font/google`
- Automatic font subsetting
- Self-hosted fonts (no external requests)

### 6. Caching Strategy

**Static Generation (SSG):**
```tsx
// Homepage, blog posts
export const revalidate = 300; // ISR: 5 minutes
```

**Client-Side Caching:**
```tsx
// API calls with cache
const res = await fetch('/api/rooms', {
  next: { revalidate: 30 }
});
```

### 7. Bundle Analysis

**Analyze bundle size:**
```bash
npm install --save-dev @next/bundle-analyzer

# In next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(config);

# Run analysis
ANALYZE=true npm run build
```

## Performance Benchmarks (Target)

- **First Contentful Paint (FCP):** < 1.8s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.8s
- **Cumulative Layout Shift (CLS):** < 0.1
- **First Input Delay (FID):** < 100ms

## Monitoring

**Lighthouse CI:**
```bash
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=http://localhost:3000
```

**Web Vitals:**
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## Future Optimizations

1. **Service Worker:** PWA support for offline functionality
2. **Prefetching:** Intelligent route prefetching
3. **Edge Functions:** Move API routes to edge for lower latency
4. **CDN:** Static assets served from CDN (Cloudflare/Vercel)
5. **HTTP/3:** Enable on hosting platform
