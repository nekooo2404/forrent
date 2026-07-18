# Design - ForRent

Nguon quy chuan UI/UX cho public marketplace va cong cu quan tri ForRent. Moi thay doi giao dien phai dung token semantic, giu thong tin that va uu tien quyet dinh thue phong.

## Product Direction

- Audience: nguoi thue phong theo thang tai Ha Noi va nhan vien van hanh ForRent.
- Primary public job: tim phong phu hop, so sanh chi phi va dat lich xem.
- Primary admin job: xu ly yeu cau moi, lich xem, chat luong phong va media.
- Tone: modern-minimal, utilitarian, am ap; goi chat Ha Noi cu ma khong dung hieu ung hoai co trang tri.
- Promise: phong that, chi phi ro, lich xem duoc xac nhan.

## Macrostructure Families

- Marketing: `Marketplace Search + Evidence`. Search la trong tam hero; anh phong that la bang chung, khong phai banner trang tri.
- Listing and detail: `Workbench`. Filter la cong cu phu; danh sach, chi phi va CTA dat lich la noi dung chinh.
- Admin: `Work Queue`. Viec can xu ly dung truoc thong ke va dieu huong.
- Content and legal: `Long Document`. Mot cot doc ro, measure toi da 70ch.

## Runtime Token Contract

Runtime client va admin duoc build trong hai Docker context rieng, vi vay token duoc mirror trong hai file `app/globals.css`. `tokens.css` tai root la portable export; ten va vai tro phai dong nhat voi cac runtime token.

### Surfaces

- Page: nen giay am, khong dung trang tinh khiet.
- Control: surface am dam hon page mot bac de tach filter/sidebar.
- Card: surface sang nhat, co border ro nhe; chi mot shadow whisper.
- Raised: dropdown, modal va sticky surface; khong xep chong shadow.
- Inverse: chi dung cho gallery modal va footer.

### Color Roles

- Brown-orange primary chi danh cho primary CTA, active intent va focus.
- Ink/secondary dung cho heading/body/metadata; khong dung primary cho moi label.
- Sage muted danh cho `Con trong`.
- Warm amber danh cho trang thai cho xu ly/sap trong.
- Warm grey danh cho da thue/an/luu tru.
- Error luon kem icon va huong phuc hoi; khong truyen dat bang mau don le.

## Typography

- Display: `ui-serif`, Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia; weight 700; roman only.
- Body/UI: existing Open Sans-compatible system stack for Vietnamese coverage; weight 400.
- Buttons and labels: body stack, weight 600-700; clickable text stays on one line.
- Body minimum: 16px, line-height 1.5-1.65, measure 45-75ch.
- Display hierarchy: 32/40/48px caps by context; heading wraps with `overflow-wrap: anywhere`.
- Prices and operational numbers use tabular numerals.

## Spacing And Layout

- Four-point scale: 4, 8, 12, 16, 24, 32, 40, 64, 96.
- Mobile gutters: 16px. Desktop gutters: 24px. Max public content: 1280px.
- Image-bearing grid tracks must use `minmax(0, 1fr)`.
- Root uses `overflow-x: clip`; horizontal overflow must never be hidden as a layout fix.
- Verify 320, 375, 414, 768, 1024 and 1440 CSS px.

## Shape And Elevation

- Input radius: 6px. Button radius: 6px. Card/modal radius: 8px. Badge radius: 999px only for status chips.
- Border: 1px in every state; focus uses outline, never a thicker border.
- Shadow low: one whisper shadow for cards.
- Shadow raised: one restrained shadow for modal/dropdown only.
- No card-in-card, glow, glassmorphism or decorative gradients.

## Controls And Eight States

Every button, link-control, input, select and disclosure supports default, hover, focus-visible, active, disabled, loading, error and success where the state is applicable.

- Hover only inside capable pointer contexts; one visual signal per control.
- Focus ring appears instantly, at least 2px and 3:1 contrast.
- Active uses at most `translateY(1px)` or `scale(.98)`.
- Disabled includes opacity, cursor and semantic attribute.
- Loading keeps an honest label and prevents duplicate submissions.
- Error names the failure and gives a recovery path.
- Touch target minimum: 44x44 CSS px.

## Motion

- Easings: `--ease-out`, `--ease-in`, `--ease-in-out` only.
- Durations: 120ms press, 220ms hover/menu, 300ms modal, 420ms complex disclosure maximum.
- Animate transform and opacity only, except native disclosure mechanics.
- No universal scroll reveals, parallax, bounce or infinite decorative motion.
- Reduced motion removes spatial movement and caps feedback at 150ms.

## Public Marketplace Rules

- Hero starts with search and representative room media. Overlay preserves image evidence.
- Primary filters: keyword, area, price and room type. Ward, area size and amenities live in `Nang cao`.
- Every room card presents a single decision cluster in this order: price, deposit, fixed monthly fee, electricity/water.
- Status palette: sage for available, amber for waiting/soon, warm grey for rented/archived.
- Gallery exposes media type and semantic label: overview, sleeping area, kitchen, bathroom, balcony or video tour.
- Empty and unavailable states offer `Tim phong khac` and `Gui nhu cau`.
- Mobile footer keeps direct phone/email visible and places navigation groups in native disclosures.

## Admin Rules

- Same palette, typography and control language as public; denser spacing and less decoration.
- Dashboard begins with `Viec can xu ly`: uncontacted requests, today's appointments, rooms needing updates and media needing review.
- Statistics are secondary evidence, not the first workflow.
- Calendar is agenda-first below 768px; month grid is desktop-only secondary context.
- Operational labels are concrete and Vietnamese-first.

## Content Voice

- Use specific verbs: `Tim phong`, `Dat lich xem`, `Gui nhu cau`, `Luu thay doi`.
- No fabricated metrics, testimonials, availability or guarantees.
- No internal terms in public copy.
- Errors state what happened and what the user can do next.

## Quality Gates

- Lint and production builds pass for both frontends.
- Backend migrations are committed and `makemigrations --check` passes.
- Playwright critical, accessibility and cross-browser suites pass.
- Axe has no serious/critical violations on public/admin, mobile/desktop.
- No horizontal overflow or clickable two-line labels at required widths.
- Visual regression baselines are reviewed separately from required CI.

## Exports

- Portable CSS: [`tokens.css`](tokens.css).
- Tailwind runtime mapping remains in each package's `tailwind.config.ts` because client/admin are built independently.
- Semantic RGB runtime values are retained for Tailwind alpha support; the portable source uses OKLCH.
