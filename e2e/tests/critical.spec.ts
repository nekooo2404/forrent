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

  test('homepage nav, theme toggle, and scroll state work', async ({ page }) => {
    await page.goto('/homepage');

    await expect(page).toHaveTitle(/ForRent/);
    await expect(page.getByTestId('site-nav')).toBeVisible();
    await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');

    const initialNavHeight = await page.getByTestId('site-nav').evaluate((element) => element.getBoundingClientRect().height);
    expect(initialNavHeight).toBeLessThanOrEqual(82);

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      await expect(page.getByTestId('theme-compact-toggle')).toBeHidden();
      await expect(page.getByTestId('site-nav').getByRole('button', { name: 'Tài khoản' })).toBeHidden();
      await expect(page.locator('.site-menu-button')).toBeVisible();
      await page.locator('.site-menu-button').click();
      await expect(page.locator('.site-mobile-menu')).toBeVisible();
      await expect(page.locator('.site-mobile-menu').getByTestId('theme-toggle')).toBeVisible();
      await page.locator('.site-mobile-menu').getByTestId('theme-dark').click();
      await expect(page.locator('html')).toHaveClass(/dark/);

      await page.locator('.site-mobile-menu').getByTestId('theme-light').click();
      await expect(page.locator('html')).toHaveClass(/light/);

      await page.locator('.site-mobile-menu').getByTestId('theme-system').click();
      await expect(page.locator('html')).toHaveClass(/(light|dark)/);

      await page.locator('.site-close-button').click();
      await expect(page.locator('.site-mobile-menu')).toBeHidden();
    } else {
      await expect(page.locator('a[href="/rooms"]').first()).toBeVisible();
      await expect(page.locator('a[href="/blogs"]').first()).toBeVisible();
      await expect(page.locator('a[href="/contact"]').first()).toBeVisible();
      await expect(page.getByTestId('theme-toggle')).toBeVisible();

      await page.getByTestId('theme-dark').click();
      await expect(page.locator('html')).toHaveClass(/dark/);

      await page.getByTestId('theme-light').click();
      await expect(page.locator('html')).toHaveClass(/light/);

      await page.getByTestId('theme-system').click();
      await expect(page.locator('html')).toHaveClass(/(light|dark)/);
    }

    await page.evaluate(() => window.scrollTo(0, 120));
    await expect(page.getByTestId('site-nav')).toHaveClass(/site-navbar-scrolled/);

    if (viewport && viewport.width >= 768) {
      await expect
        .poll(() => page.getByTestId('site-nav').evaluate((element) => element.getBoundingClientRect().height))
        .toBeLessThan(initialNavHeight);
    }
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
    expect(await serviceWorker.text()).toContain('forrent-static');
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

    await page.locator('.site-close-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeHidden();
  });

  test('rooms filters submit stable query params', async ({ page }) => {
    await page.goto('/rooms');

    const filterForm = page.locator('form[action="/rooms"]').filter({ has: page.locator('input[name="search"]') });
    if (!(await filterForm.isVisible())) {
      await page.getByText('Bộ lọc phòng', { exact: true }).click();
    }
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
    const filterForm = page.locator('form[action="/rooms"]').filter({ has: page.locator('input[name="search"]') });
    if (!(await filterForm.isVisible())) await page.getByRole('button', { name: 'Bộ lọc phòng' }).click();

    const advanced = filterForm.locator('details');
    await expect(advanced).not.toHaveAttribute('open', '');
    await advanced.locator('summary').click();
    await expect(advanced).toHaveAttribute('open', '');

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
