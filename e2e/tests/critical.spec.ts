import { expect, test } from '@playwright/test';

test.describe('Public critical flows', () => {
  test('anonymous public navigation does not refresh tokens', async ({ page }) => {
    const refreshRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/auth/refresh') refreshRequests.push(request.url());
    });

    for (const path of ['/homepage', '/rooms', '/contact', '/blogs', '/log-in']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    expect(refreshRequests).toEqual([]);
  });

  test('homepage nav stays light-only and scroll state works', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/homepage');

    await expect(page).toHaveTitle(/ForRent/);
    await expect(page.getByTestId('site-nav')).toBeVisible();
    await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('html')).toHaveClass('light');
    await expect(page.getByTestId('theme-toggle')).toHaveCount(0);
    await expect(page.getByTestId('theme-compact-toggle')).toHaveCount(0);

    const initialNavHeight = await page.getByTestId('site-nav').evaluate((element) => element.getBoundingClientRect().height);
    expect(initialNavHeight).toBeLessThanOrEqual(82);

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      await expect(page.getByTestId('site-nav').getByRole('button', { name: 'Tài khoản' })).toBeHidden();
      await expect(page.locator('.site-menu-button')).toBeVisible();
      await page.locator('.site-menu-button').click();
      await expect(page.locator('.site-mobile-menu')).toBeVisible();
      await page.locator('.site-close-button').click();
      await expect(page.locator('.site-mobile-menu')).toBeHidden();
    } else {
      await expect(page.locator('a[href="/rooms"]').first()).toBeVisible();
      await expect(page.locator('a[href="/blogs"]').first()).toBeVisible();
      await expect(page.locator('a[href="/contact"]').first()).toBeVisible();
    }

    await page.evaluate(() => window.scrollTo(0, 120));
    await expect(page.getByTestId('site-nav')).toHaveClass(/site-navbar-scrolled/);

    if (viewport && viewport.width >= 768) {
      await expect
        .poll(() => page.getByTestId('site-nav').evaluate((element) => element.getBoundingClientRect().height))
        .toBeLessThan(initialNavHeight);
    }
  });

  test('homepage uses a stable brand hero independent of room imagery', async ({ page }) => {
    await page.goto('/homepage');

    const hero = page.getByTestId('homepage-hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('img')).toHaveAttribute('src', /forrent-hero-old-quarter/);
    await expect.poll(() => hero.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
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

  test('homepage starts with readable content and touch-sized controls', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/homepage');

    const skipLink = page.getByRole('link', { name: 'Bỏ qua điều hướng' });
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('main nav')).toHaveCount(0);
    await expect(page.locator('main footer')).toHaveCount(0);
    if (!['webkit', 'Mobile Safari'].includes(testInfo.project.name)) {
      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('site-nav').locator(':focus')).toHaveCount(0);
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Phòng');
    await expect(page.locator('body')).toHaveCSS('font-family', /Open Sans/);

    const controls = page.locator('#home-room-search, #home-max-price, #home-room-type');
    for (let index = 0; index < (await controls.count()); index += 1) {
      const box = await controls.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);

    const description = page.getByText('Phòng gọn, giá rõ, phù hợp người đi làm và sinh viên.');
    await expect(description).toBeVisible();
    await expect(description).toHaveCSS('opacity', '1');
  });

  test('public PWA metadata and offline fallback are available', async ({ request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    const serviceWorker = await request.get('/sw.js');
    const offline = await request.get('/offline');

    expect(manifest.ok()).toBeTruthy();
    expect(await manifest.json()).toMatchObject({ name: 'ForRent', display: 'standalone' });
    expect(serviceWorker.ok()).toBeTruthy();
    const serviceWorkerSource = await serviceWorker.text();
    expect(serviceWorkerSource).toContain('forrent-static');
    expect(serviceWorkerSource).toContain('navigationWithOfflineFallback');
    expect(serviceWorkerSource).not.toContain('networkFirst');
    expect(serviceWorkerSource).not.toContain('theme-init');
    expect((await request.get('/theme-init.js')).status()).toBe(404);
    expect(offline.ok()).toBeTruthy();
  });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/homepage');
    await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.site-menu-button')).toBeVisible();

    await page.locator('.site-menu-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Điều hướng trên thiết bị di động' })).toBeVisible();
    await expect(page.locator('.site-mobile-menu a[href="/rooms"]')).toBeVisible();
    const mobileAccount = page.locator('.site-mobile-menu').getByTestId('public-account-actions');
    await expect(mobileAccount.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
    await expect(mobileAccount.getByRole('link', { name: 'Đăng ký', exact: true })).toBeVisible();

    await page.locator('.site-close-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeHidden();
  });

  test('rooms filters submit stable query params', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="site-nav"]:visible').first()).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });

    const filterForm = page.locator('form[action="/rooms"]').filter({ has: page.locator('input[name="search"]') });
    const filterToggle = page.getByRole('button', { name: 'Bộ lọc phòng' });
    if (await filterToggle.isVisible()) await filterToggle.click();
    await expect(filterForm).toBeVisible();
    await filterForm.locator('input[name="search"]').fill('test');
    await filterForm.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/search=test/);
    const removeSearch = page.getByRole('link', { name: 'Bỏ lọc Từ khóa: test' });
    await expect(removeSearch).toBeVisible();
    await removeSearch.click();
    await expect(page).not.toHaveURL(/search=test/);
  });

  test('ward filter is immediately available when Hanoi is the only city', async ({ page }) => {
    await page.goto('/rooms');

    const wardSelect = page.locator('select[name="ward"]');
    await expect(wardSelect).toBeEnabled();
    await expect(page.locator('input[type="hidden"][name="city"]')).toHaveValue('1');
  });

  test('advanced room filters use native progressive disclosure and touch-sized options', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="site-nav"]:visible').first()).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
    const filterForm = page.locator('form[action="/rooms"]').filter({ has: page.locator('input[name="search"]') });
    const filterToggle = page.getByRole('button', { name: 'Bộ lọc phòng' });
    if (await filterToggle.isVisible()) await filterToggle.click();
    await expect(filterForm).toBeVisible();

    const advanced = filterForm.locator('details');
    await expect(advanced).not.toHaveAttribute('open', '');
    await expect(filterForm.getByRole('button', { name: 'Tìm phòng' })).toBeVisible();
    await expect(filterForm.locator('select[name="status"]')).toHaveCount(0);
    await advanced.locator('summary').click();
    await expect(advanced).toHaveAttribute('open', '');
    await expect(advanced.locator('input[name="room_type"]')).not.toHaveCount(0);

    const amenityLabel = advanced.locator('label').first();
    const box = await amenityLabel.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  });

  test('room gallery adapts to zero, one, and multiple images', async ({ page }) => {
    await page.goto('/rooms/e2e-room');
    await expect(page.locator('[data-image-count="0"]')).toContainText('Ảnh phòng đang được cập nhật');
    await expect(page.getByRole('button', { name: 'Ảnh tiếp theo' })).toHaveCount(0);

    await page.goto('/rooms/e2e-room-one');
    const oneImageGallery = page.locator('[data-image-count="1"]');
    await expect(oneImageGallery).toHaveCount(1);
    await expect(oneImageGallery).toBeVisible();
    await page.getByRole('button', { name: /Xem .*ảnh chính/ }).click();
    await expect(page.getByRole('button', { name: 'Ảnh tiếp theo' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Đóng xem ảnh' }).click();

    await page.goto('/rooms/e2e-room-many');
    const manyImageGallery = page.locator('[data-image-count="3"]');
    await expect(manyImageGallery).toHaveCount(1);
    await expect(manyImageGallery).toBeVisible();
    await page.getByRole('button', { name: /Xem .*ảnh chính/ }).click();
    await expect(page.getByRole('button', { name: 'Ảnh tiếp theo' })).toBeVisible();
  });

  test('room detail resolves an encoded Vietnamese slug', async ({ page }) => {
    await page.goto('/rooms/ph%C3%B2ng-%C4%91%E1%BA%B9p-h%C3%A0-n%E1%BB%99i');

    await expect(page.getByRole('heading', { name: 'Phòng đẹp Hà Nội', level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/Phòng đẹp Hà Nội/);
    expect(await page.title()).not.toContain('🎉');
    await expect(page.getByText('Phòng này hiện không còn hiển thị')).toHaveCount(0);
  });

  test('contact form validates required and phone fields', async ({ page }) => {
    await page.goto('/contact');

    const fullName = page.locator('#fullName');
    const email = page.locator('#email');
    const phone = page.locator('#phone');
    const message = page.locator('#message');

    await expect(fullName).toHaveJSProperty('validity.valid', false);
    await fullName.fill('Test User');
    await email.fill('test@example.com');
    await phone.fill('123');
    await message.fill('Need a room this week.');

    await expect
      .poll(() => phone.evaluate((element) => (element as HTMLInputElement).validity.valid))
      .toBe(false);
  });

  test('room detail booking panel is reachable', async ({ page }) => {
    await page.goto('/rooms');

    const firstRoom = page.getByRole('link', { name: 'Xem và đặt lịch' }).first();
    await firstRoom.scrollIntoViewIfNeeded();
    await expect(firstRoom).toBeVisible();
    await firstRoom.click();
    await expect(page).toHaveURL(/\/rooms\/[^/?#]+/);
    await expect(page.getByRole('complementary', { name: 'Tư vấn và đặt lịch xem phòng' })).toBeVisible();
  });

  test('legacy room detail URL permanently redirects to the clean URL', async ({ page }) => {
    await page.goto('/room-details?slug=e2e-room');

    await expect(page).toHaveURL(/\/rooms\/e2e-room$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Accessibility basics', () => {
  test('homepage visible buttons meet 44px touch target', async ({ page }) => {
    await page.goto('/homepage');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let index = 0; index < count; index += 1) {
      const box = await buttons.nth(index).boundingBox();
      if (!box) continue;

      expect(box.width).toBeGreaterThanOrEqual(43.5);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('focus is visible on keyboard navigation', async ({ page }) => {
    await page.goto('/homepage');
    await page.keyboard.press('Tab');

    await expect(page.locator(':focus')).toBeVisible();
  });
});
