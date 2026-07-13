# ForRent UI/UX Upgrade Design

## Goal

Make ForRent a clear, fast, mobile-first rental experience for people looking for monthly rooms in Hanoi. Preserve the existing API, routes, warm-brown brand, and light/dark themes.

## Product Story

Every public page should answer four questions in this order: what rooms are available, what they cost, where they are, and how to book a viewing. The primary path is `homepage -> rooms -> room detail -> viewing request`; `/contact` is the fallback when inventory does not match.

## Visual Direction

- Quiet warm minimalism: flat warm surfaces, one amber-brown accent, restrained teal only for semantic success.
- Open Sans remains because it is already loaded, supports Vietnamese, and avoids another font request.
- One primary action per section. No slideshow, scroll hijacking, 3D, decorative particles, or heavy glass effects.
- Mobile header shows only the logo and menu. Desktop header is at most 80px and shrinks after scrolling.
- Body text is at least 16px with 1.5 line height; interactive controls are at least 44px.

## Phase 1

- Simplify the shared navbar, mobile menu, buttons, cards, motion, and surfaces.
- Tighten homepage hierarchy and keep category descriptions visible on touch devices.
- Make room filtering and calls to action easier to scan on mobile.
- Remove the Next Image blur placeholder that violates strict CSP.
- Add skip navigation and preserve reduced-motion behavior.

## Phase 2

- Add a native web app manifest, service worker registration, and an offline fallback.
- Cache only same-origin static assets and successful public navigation responses. Never cache auth, admin, API mutations, or cross-origin media.
- Keep filter and pagination state in URLs. Use existing room/contact records and access logs as the initial conversion data source instead of adding a tracking vendor or collecting new personal data.

## Phase 3 Gates

- Add recently viewed or rule-based recommendations only after inventory exceeds 12 active rooms.
- Add geolocation only after multiple supported districts exist and only after an explicit user action.
- Add 360 tours only when real 360 assets are supplied.
- AI ranking requires enough consented interaction data to evaluate it. VUI, AR/VR, and decorative 3D remain out of scope until measured demand justifies their accessibility, privacy, and performance cost.

## Verification

- Lint and production build for client and admin.
- Playwright on desktop Chrome, Mobile Chrome, and Mobile Safari.
- Axe in light/dark and desktop/mobile.
- No horizontal overflow at 320px, 390px, or 1440px.
- Production browser console contains no CSP violations.
