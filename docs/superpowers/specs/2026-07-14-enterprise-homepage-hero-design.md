# Enterprise Homepage Hero Design

## Goal

Replace the empty logo placeholder on the public homepage with a stable, brand-owned interior hero and make account actions discoverable without weakening the room-search workflow.

## Visual Direction

- Use a realistic warm-brown Hanoi old-quarter interior image as the full hero background.
- Keep the existing warm light palette and semantic Tailwind tokens.
- Apply one uniform dark-brown image scrim. Do not use gradients, glass effects, decorative particles, or nested cards.
- Render headline and supporting copy directly over the image, with a maximum readable line length.
- Keep corners at 8px or less and shadows restrained.

## Hero Layout

- The brand image always renders in the hero and never depends on room API data.
- Desktop uses a full-width image band below the navbar. Copy sits on the left and the search tool is anchored near the bottom.
- Mobile stacks search fields in a compact two-column layout: location spans both columns, price and room type share one row, and the submit button remains at least 44px high.
- Hero height must leave the heading of the next section visible at common desktop and mobile viewport heights.
- `Tìm phòng` is the only primary CTA. `Xem tất cả phòng` and `Gửi nhu cầu` are subordinate text links.

## Search Form

- Preserve the existing GET request to `/rooms` and current query names: `search`, `max_price`, and `room_type`.
- Keep persistent visible labels for all controls.
- Reuse native input and select controls with existing focus styles.
- Use stable grid tracks so labels, values, and the submit button do not resize the hero.

## Authentication Navigation

- Anonymous desktop users see explicit `Đăng nhập` and `Đăng ký` links at the right of the navbar.
- Both labels use `white-space: nowrap` and a reserved account area width.
- Below the existing `lg` breakpoint, the navbar switches directly to the hamburger menu before labels can wrap.
- Anonymous mobile users see `Đăng nhập` and `Đăng ký` actions at the bottom of the menu.
- Authenticated users see the current account icon and profile popover.
- Session loading reserves the same account-area dimensions to prevent layout shift and does not briefly show anonymous links.

## Image Asset

- Use a licensed Unsplash interior photograph with warm timber and restrained neutral tones. Download it into the repository so production does not depend on Unsplash availability or require a third-party image CSP rule.
- Record the exact source URL, license URL, local path, and retrieval date in `docs/assets/third-party-assets.md`.
- Store the optimized local asset at `frontend-client/public/brand/forrent-hero-old-quarter.jpg` and render it with `next/image`, `fill`, `priority`, responsive `sizes`, and a fixed hero height.
- Treat the image as brand atmosphere rather than a specific rental listing; use empty alternative text because the adjacent copy carries the content.

## States And Failure Handling

- Room API failure must not alter or blank the hero.
- Featured-room sections below the hero keep their existing data and empty states.
- If session lookup fails, navbar falls back to anonymous actions after loading completes.
- The local hero asset removes third-party image availability and CSP dependencies.

## Accessibility And Responsive Requirements

- Hero text and links must meet WCAG 2.1 AA contrast against the scrim.
- All interactive controls remain keyboard accessible with visible focus indicators.
- Touch targets are at least 44px high.
- Text does not overlap the search tool at 320px, 390px, 768px, 1024px, and 1280px widths.
- Reduced-motion behavior continues to use the existing motion system.

## Verification

- Extend E2E coverage for explicit anonymous auth links, authenticated account controls, no-wrap desktop labels, and mobile menu auth actions.
- Update homepage and navbar visual baselines for Windows and Linux.
- Run axe on homepage desktop/mobile, frontend lint, TypeScript check, production build, and the Chromium E2E suite.
- Inspect desktop and mobile screenshots before merge.

## Out Of Scope

- Redesigning room cards, room detail, admin UI, authentication forms, or backend session APIs.
- Adding a new component library, carousel, slideshow, dark mode, personalization, or third-party image host.
