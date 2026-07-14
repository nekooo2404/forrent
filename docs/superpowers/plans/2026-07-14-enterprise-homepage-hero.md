# Enterprise Homepage Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage placeholder with a fixed warm Hanoi interior hero and expose stable, no-wrap authentication actions in the public navbar.

**Architecture:** Keep the homepage server-rendered and use one local `next/image` asset so hero rendering is independent of room API data. Extend the existing client-side `ProfileMenu` state machine to render loading, anonymous, and authenticated states inside a fixed-width account region.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React, Playwright, axe-core.

---

### Task 1: Add Behavior Regressions

**Files:**
- Modify: `e2e/tests/critical.spec.ts`

- [ ] **Step 1: Add failing tests for the hero and anonymous account actions**

Add these tests inside `Public critical flows`:

```ts
test('homepage uses a stable brand hero independent of room imagery', async ({ page }) => {
  await page.goto('/homepage');

  const hero = page.getByTestId('homepage-hero');
  await expect(hero).toBeVisible();
  await expect(hero.locator('img')).toHaveAttribute('src', /forrent-hero-old-quarter/);
  await expect(hero.getByRole('button', { name: 'Tìm phòng' })).toBeVisible();
  await expect(page.getByText('Phòng mới sẽ được cập nhật tại đây')).toHaveCount(0);
});

test('anonymous desktop navigation exposes no-wrap account actions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/homepage');

  const account = page.getByTestId('public-account-actions');
  const login = account.getByRole('link', { name: 'Đăng nhập', exact: true });
  const signup = account.getByRole('link', { name: 'Đăng ký', exact: true });
  await expect(login).toBeVisible();
  await expect(signup).toBeVisible();
  await expect(login).toHaveCSS('white-space', 'nowrap');
  await expect(signup).toHaveCSS('white-space', 'nowrap');
});

test('authenticated navigation keeps the account menu', async ({ page }) => {
  await page.route('**/api/auth/session', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: 'Success', data: { authenticated: true } }),
  }));
  await page.goto('/homepage');

  await expect(page.getByRole('button', { name: 'Tài khoản' })).toBeVisible();
  await expect(page.getByTestId('public-account-actions')).toHaveCount(0);
});
```

- [ ] **Step 2: Add the mobile account-action assertion**

Extend the existing `mobile menu opens and closes` test after opening the menu:

```ts
const mobileAccount = page.locator('.site-mobile-menu').getByTestId('public-account-actions');
await expect(mobileAccount.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
await expect(mobileAccount.getByRole('link', { name: 'Đăng ký', exact: true })).toBeVisible();
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```powershell
cd e2e
npx playwright test tests/critical.spec.ts --project=chromium --workers=1 --grep "stable brand hero|anonymous desktop|authenticated navigation|mobile menu"
```

Expected: failures for the missing hero test id and explicit authentication links.

- [ ] **Step 4: Commit the failing regressions**

```powershell
git add e2e/tests/critical.spec.ts
git commit -m "test: cover homepage hero and account navigation"
```

### Task 2: Add The Brand Hero Asset And Layout

**Files:**
- Create: `frontend-client/public/brand/forrent-hero-old-quarter.jpg`
- Create: `docs/assets/third-party-assets.md`
- Modify: `frontend-client/app/homepage/page.tsx`

- [ ] **Step 1: Download and document the licensed Unsplash asset**

Download the approved Unsplash image into the project:

```powershell
curl.exe -L --fail --silent --show-error "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2000&h=1200&q=86&fm=jpg" -o "frontend-client/public/brand/forrent-hero-old-quarter.jpg"
```

Record its source and the Unsplash License in `docs/assets/third-party-assets.md`, then inspect the local file before implementation.

- [ ] **Step 2: Replace the split placeholder hero with the full-bleed hero**

In `frontend-client/app/homepage/page.tsx`, remove `heroRoomImage` and the conditional placeholder. Use this structure:

```tsx
<header
  className="relative mt-16 min-h-[550px] overflow-hidden lg:mt-20 lg:min-h-[560px]"
  data-testid="homepage-hero"
>
  <Image
    alt=""
    className="object-cover object-[62%_center] lg:object-center"
    fill
    priority
    sizes="100vw"
    src="/brand/forrent-hero-old-quarter.jpg"
  />
  <div aria-hidden="true" className="absolute inset-0 bg-inverse-surface/65" />
  <div className="relative mx-auto flex min-h-[550px] w-full max-w-container-max flex-col px-margin-mobile pb-4 pt-8 text-inverse-on-surface md:px-margin-desktop lg:min-h-[560px] lg:pb-6 lg:pt-14">
    <div className="max-w-2xl">
      <p className="mb-3 font-label-caps text-label-caps uppercase text-inverse-primary">
        Phòng thuê theo tháng tại Hà Nội
      </p>
      <h1 className="max-w-2xl text-[38px] font-extrabold leading-[1.1] md:text-[48px]">
        Phòng đẹp, giá rõ, đặt lịch không vòng vo
      </h1>
      <p className="mt-4 max-w-xl text-base font-medium leading-7 text-inverse-on-surface/90 md:text-lg">
        Lọc phòng còn trống theo khu vực, giá tháng, cọc và tiện ích. ForRent xác nhận lại trước khi bạn đi xem.
      </p>
      <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold">
        <Link className="min-h-11 py-3 underline underline-offset-4" href="/rooms">Xem tất cả phòng</Link>
        <Link className="min-h-11 py-3 underline underline-offset-4" href="/contact">Gửi nhu cầu</Link>
      </div>
    </div>

    <form
      action="/rooms"
      className="mt-auto grid grid-cols-2 gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/95 p-3 text-on-surface shadow-high lg:grid-cols-[1.4fr_0.85fr_0.85fr_auto] lg:items-end"
    >
      <div className="col-span-2 flex flex-col rounded-md bg-surface-container-low px-4 py-2 lg:col-span-1">
        <label className="mb-1 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-room-search">Khu vực</label>
        <div className="relative">
          <MapPin aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} strokeWidth={1.8} />
          <input className="min-h-11 w-full border-none bg-transparent py-2 pl-7 text-base text-on-surface placeholder:text-on-surface-variant/60 focus:ring-0" id="home-room-search" name="search" placeholder="Tây Mỗ, Cầu Giấy..." type="text" />
        </div>
      </div>
      <div className="flex flex-col rounded-md bg-surface-container-low px-4 py-2">
        <label className="mb-1 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-max-price">Giá tối đa</label>
        <input className="min-h-11 w-full border-none bg-transparent py-2 text-base text-on-surface placeholder:text-on-surface-variant/60 focus:ring-0" id="home-max-price" min="0" name="max_price" placeholder="8.000.000" type="number" />
      </div>
      <div className="flex flex-col rounded-md bg-surface-container-low px-4 py-2">
        <label className="mb-1 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-room-type">Loại phòng</label>
        <select className="min-h-11 w-full border-none bg-transparent py-2 text-base text-on-surface focus:ring-0" defaultValue="" id="home-room-type" name="room_type">
          <option value="">Tất cả</option>
          <option value="CCMN">CCMN</option>
          <option value="CCDV">CCDV</option>
          <option value="HOUSE">Nhà nguyên căn</option>
        </select>
      </div>
      <button className="urban-cta col-span-2 flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 font-button text-button lg:col-span-1" type="submit">
        <Search aria-hidden="true" size={20} strokeWidth={1.8} />
        Tìm phòng
      </button>
    </form>
  </div>
</header>
```

Keep the existing control names and options unchanged. Remove the old outer split grid, logo fallback, caption overlay, and separate `urban-panel` wrapper.

- [ ] **Step 3: Run the focused hero regression**

Run:

```powershell
cd e2e
npx playwright test tests/critical.spec.ts --project=chromium --workers=1 --grep "stable brand hero"
```

Expected: pass.

- [ ] **Step 4: Commit the hero**

```powershell
git add frontend-client/app/homepage/page.tsx frontend-client/public/brand/forrent-hero-old-quarter.jpg docs/assets/third-party-assets.md
git commit -m "feat: add enterprise homepage hero"
```

### Task 3: Make Authentication Actions Discoverable

**Files:**
- Modify: `frontend-client/components/profile-menu.tsx`
- Modify: `frontend-client/components/site-nav.tsx`

- [ ] **Step 1: Replace the boolean with an explicit auth state**

In `ProfileMenu`, use:

```tsx
type AuthState = "loading" | "anonymous" | "authenticated";

const [authState, setAuthState] = useState<AuthState>("loading");
```

Set `authenticated` or `anonymous` after `getAuthSession()`. Set `anonymous` in the error path and after logout.

- [ ] **Step 2: Render fixed-width loading and anonymous states before the existing popover**

Return these states before rendering the authenticated button and popover:

```tsx
if (authState === "loading") {
  return <div aria-hidden="true" className="min-h-11 w-full lg:w-[194px]" />;
}

if (authState === "anonymous") {
  return (
    <div
      className="flex min-h-11 w-full items-center justify-end gap-2 lg:w-[194px]"
      data-testid="public-account-actions"
    >
      <Link className="inline-flex min-h-11 min-w-[86px] items-center justify-center whitespace-nowrap px-2 text-sm font-semibold text-secondary" href="/log-in">
        Đăng nhập
      </Link>
      <Link className="inline-flex min-h-11 min-w-[90px] items-center justify-center whitespace-nowrap rounded-md border border-primary/45 bg-surface-container-lowest px-3 text-sm font-semibold text-primary" href="/sign-up">
        Đăng ký
      </Link>
    </div>
  );
}
```

Wrap the authenticated menu in `className="relative z-[60] flex min-h-11 w-full justify-end lg:w-[194px]"` so all states reserve the same desktop width.

- [ ] **Step 3: Let mobile account actions use the available width**

In `frontend-client/components/site-nav.tsx`, change the mobile wrapper to:

```tsx
<div className="site-mobile-profile">
  <div className="site-profile-card w-full">
    <ProfileMenu />
  </div>
</div>
```

- [ ] **Step 4: Run focused account regressions**

Run:

```powershell
cd e2e
npx playwright test tests/critical.spec.ts --project=chromium --workers=1 --grep "anonymous desktop|authenticated navigation|mobile menu"
```

Expected: pass with no wrapping and no anonymous/authenticated flash assertion failures.

- [ ] **Step 5: Commit account navigation**

```powershell
git add frontend-client/components/profile-menu.tsx frontend-client/components/site-nav.tsx
git commit -m "feat: expose public account actions"
```

### Task 4: Visual And Quality Gates

**Files:**
- Modify: `e2e/tests/visual.spec.ts-snapshots/win32/homepage-light.png`
- Modify: `e2e/tests/visual.spec.ts-snapshots/win32/desktop-navbar-light.png`
- Modify: `e2e/tests/visual.spec.ts-snapshots/win32/mobile-menu-light.png`
- Modify after CI artifact review: matching files under `e2e/tests/visual.spec.ts-snapshots/linux/`

- [ ] **Step 1: Run static quality gates**

```powershell
cd frontend-client
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0 with no ESLint warnings.

- [ ] **Step 2: Run accessibility and responsive behavior checks**

```powershell
cd e2e
npx playwright test tests/accessibility.spec.ts tests/critical.spec.ts --project=chromium --workers=1
```

Expected: all selected tests pass, including homepage desktop/mobile axe cases.

- [ ] **Step 3: Generate Windows visual baselines**

```powershell
cd e2e
npx playwright test tests/visual.spec.ts --project=chromium --workers=1 --update-snapshots
```

Inspect `homepage-light.png`, `desktop-navbar-light.png`, and `mobile-menu-light.png`. Confirm the hero image is nonblank, copy and search controls do not overlap, auth labels stay on one line, and the next homepage section remains visible.

- [ ] **Step 4: Run the complete local regression suite**

```powershell
cd e2e
npm run test:ci
```

Expected: all Chromium tests pass.

- [ ] **Step 5: Run React diagnostics and encoding checks**

```powershell
cd frontend-client
npx react-doctor@latest --verbose --scope changed --base main
cd ..
python scripts/check-mojibake.py
git diff --check
```

Expected: no changed-file React findings, no mojibake, and no whitespace errors.

- [ ] **Step 6: Commit visual baselines**

```powershell
git add e2e/tests/visual.spec.ts-snapshots/win32
git commit -m "test: update homepage visual baselines"
```

- [ ] **Step 7: Push the branch and use CI actual images for Linux baselines**

Push the feature branch, open a PR, and wait for the Linux E2E job. If visual checks fail only because Linux baselines differ, download the Playwright report artifact, inspect each `*-actual.png`, copy only approved actual images into the corresponding `linux/` baseline path, commit, and rerun CI without increasing `maxDiffPixelRatio`.

- [ ] **Step 8: Merge only after all required checks pass**

Verify backend, frontend client/admin, E2E, Trivy, and any required branch checks are successful. Squash-merge the PR and confirm `origin/main` points to the merge SHA.
