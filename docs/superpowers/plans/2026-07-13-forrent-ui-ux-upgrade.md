# ForRent UI/UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved mobile-first, minimal, accessible UI upgrade plus a native PWA foundation.

**Architecture:** Reuse existing Next.js components, semantic color tokens, Playwright tests, and browser APIs. Shared navbar/global-style changes carry most of the visual upgrade; page edits are limited to content hierarchy and touch usability.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 3, native service worker, Playwright, axe-core.

---

### Task 1: Lock Browser Regressions

**Files:**
- Modify: `e2e/tests/critical.spec.ts`
- Modify: `e2e/tests/security.spec.ts`

- [x] Add assertions for compact/shrinking header, mobile-only logo/menu, 44px homepage controls, skip link, and visible category descriptions.
- [x] Run the targeted tests and confirm they fail for the current UI.
- [x] Keep the existing CSP browser test as the regression for the blur-placeholder violation.

### Task 2: Simplify Shared Navigation and Motion

**Files:**
- Modify: `frontend-client/components/site-nav.tsx`
- Modify: `frontend-client/app/globals.css`
- Modify: `frontend-client/app/layout.tsx`

- [x] Reuse `useFocusTrap` for the mobile menu.
- [x] Reduce header height and move theme/account controls into the mobile menu.
- [x] Add a keyboard skip link and a stable `main` target.
- [x] Remove decorative hover layers, heavy gradients, and automatic reveal motion while retaining focus/pressed feedback.

### Task 3: Clarify Public Content and Touch UI

**Files:**
- Modify: `frontend-client/app/homepage/page.tsx`
- Modify: `frontend-client/app/rooms/page.tsx`
- Modify: `frontend-client/components/site-footer.tsx`

- [x] Make the hero state the audience, value, and primary action immediately.
- [x] Keep room-type descriptions visible without hover.
- [x] Reduce oversized page headers and marketing chips.
- [x] Ensure filters, sort controls, links, and footer navigation meet touch-size requirements.

### Task 4: Remove CSP-Violating Image Placeholder

**Files:**
- Modify: `frontend-client/lib/image.ts`
- Modify callers in homepage, rooms, and room gallery.

- [x] Remove the dynamic blur background inline style at the shared helper.
- [x] Use stable container backgrounds as the loading placeholder.
- [x] Run the CSP browser regression and confirm zero violations.

### Task 5: Add Native PWA Foundation

**Files:**
- Create: `frontend-client/app/manifest.ts`
- Create: `frontend-client/app/offline/page.tsx`
- Create: `frontend-client/public/sw.js`
- Create: `frontend-client/components/service-worker-registration.tsx`
- Modify: `frontend-client/app/layout.tsx`

- [x] Add install metadata and existing brand icons.
- [x] Register the service worker only in production.
- [x] Use network-first navigation and cache-first same-origin static assets.
- [x] Exclude API/auth/admin/mutations and cross-origin media from caches.

### Task 6: Verify the Full Surface

**Files:**
- Update visual snapshots only when the intended layout changed.

- [x] Run client/admin lint and builds.
- [x] Run Playwright critical, security, accessibility, and visual suites.
- [x] Inspect screenshots and DOM metrics at 320px, 390px, and 1440px.
- [x] Confirm dark/light/system, mobile menu focus, scroll behavior, and console output.
