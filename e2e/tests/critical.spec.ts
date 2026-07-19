import { expect, test } from '@playwright/test';

import { mockAdminCalendar, mockAdminDashboard, mockAdminRoomInventory } from './admin-mocks';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

test.describe('Public critical flows', () => {
  for (const target of [
    { label: 'public', url: '/log-in' },
    { label: 'admin', url: new URL('/log-in', adminBaseURL).toString() },
  ]) {
    test(`${target.label} login failure stays localized and rejects duplicate submits`, async ({ page }) => {
      let requestCount = 0;
      await page.route('**/api/auth/log-in', async (route) => {
        requestCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.fulfill({
          body: JSON.stringify({
            success: false,
            message: 'Email, số điện thoại hoặc mật khẩu chưa đúng. Vui lòng thử lại hoặc chọn Quên mật khẩu.',
          }),
          contentType: 'application/json',
          status: 401,
        });
      });

      await page.goto(target.url);
      await expect(page.locator('form')).toHaveAttribute('data-ready', 'true');
      const identifierInput = page.getByLabel('Email hoặc số điện thoại');
      await expect(identifierInput).toBeEditable();
      await identifierInput.fill('tenant@example.com');
      await expect(identifierInput).toHaveValue('tenant@example.com');
      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.fill('Password@123');
      await expect(identifierInput).toHaveValue('tenant@example.com');
      await expect(passwordInput).toHaveValue('Password@123');
      const submit = page.getByRole('button', { name: 'Đăng nhập', exact: true });
      await submit.click();
      await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());

      await expect.poll(() => requestCount).toBe(1);
      await expect(page.getByText(/Email, số điện thoại hoặc mật khẩu chưa đúng/).first()).toBeVisible();
      await expect(identifierInput).toHaveValue('tenant@example.com');
      await expect(passwordInput).toHaveValue('Password@123');
      await expect(submit).toBeEnabled();
      await expect(page.getByText('Invalid credentials.', { exact: true })).toHaveCount(0);
      expect(requestCount).toBe(1);
    });
  }

  test('anonymous public navigation does not refresh tokens', async ({ page }) => {
    const refreshRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/auth/refresh') refreshRequests.push(request.url());
    });

    for (const path of ['/', '/rooms', '/contact', '/blogs', '/log-in']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    expect(refreshRequests).toEqual([]);
  });

  test('homepage nav stays light-only and scroll state works', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/');

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
        .toBe(initialNavHeight);
    }
  });

  test('homepage exposes the branded social preview metadata', async ({ page, request }) => {
    const expectedTitle = 'ForRent - Tìm CCMN, CHDV giá tốt tại Hà Nội';
    await page.goto('/');

    await expect(page).toHaveTitle(expectedTitle);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', expectedTitle);
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', expectedTitle);

    const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(imageUrl).toBeTruthy();
    const socialImage = new URL(imageUrl!);
    expect(socialImage.origin).toBe('https://forrent.io.vn');
    expect(socialImage.pathname).toBe('/brand/forrent-social-preview.jpg');
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');

    const imageResponse = await request.get(socialImage.pathname);
    expect(imageResponse.ok()).toBeTruthy();
    expect(imageResponse.headers()['content-type']).toContain('image/jpeg');
    expect((await imageResponse.body()).byteLength).toBeGreaterThan(100_000);

    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest.name).toBe(expectedTitle);
  });

  test('homepage uses the first available listing photo before the brand fallback', async ({ page }) => {
    await page.goto('/');

    const hero = page.getByTestId('homepage-hero');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-hero-source', 'listing');
    await expect(hero).toHaveAttribute('data-hero-room-id', '2');
    await expect(hero).toHaveAttribute('data-hero-room-slug', 'e2e-room-hero');
    await expect(hero.locator('img')).not.toHaveAttribute('src', /forrent-hero-old-quarter/);
    await expect.poll(() => hero.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(hero.locator('[aria-hidden="true"]').first()).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(hero.getByRole('button', { name: 'Tìm phòng' })).toBeVisible();
    await expect(page.getByText('Phòng mới sẽ được cập nhật tại đây')).toHaveCount(0);
  });

  test('homepage is led by marketplace search rather than a marketing banner', async ({ page }) => {
    await page.goto('/');

    const hero = page.getByTestId('homepage-hero');
    await expect(hero).toHaveAttribute('data-search-led-marketplace', 'true');
    await expect(hero.getByRole('search', { name: 'Tìm phòng thuê' })).toBeVisible();
    await expect(hero.getByRole('button', { name: 'Tìm phòng' })).toBeVisible();
  });

  test('anonymous desktop navigation exposes no-wrap account actions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

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
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Tài khoản' })).toBeVisible();
    await expect(page.getByTestId('public-account-actions')).toHaveCount(0);
  });

  test('homepage starts with readable content and touch-sized controls', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');

    const skipLink = page.getByRole('link', { name: 'Bỏ qua điều hướng' });
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('main nav')).toHaveCount(0);
    await expect(page.locator('main footer')).toHaveCount(0);
    if (!['webkit', 'Mobile Safari'].includes(testInfo.project.name)) {
      await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('site-nav').locator(':focus')).toHaveCount(0);
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Phòng');
    await expect(page.locator('body')).toHaveCSS('font-family', /system-ui/);
    await expect(page.locator('form[data-product-event="room_search_submitted"]')).toBeVisible();

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
    await page.goto('/');
    await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.site-menu-button')).toBeVisible();

    await page.locator('.site-menu-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeVisible();
    await expect(page.locator('nav[aria-label="Điều hướng chính"]')).toBeHidden();
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
    await expect(filterForm).toHaveAttribute('data-product-event', 'room_search_submitted');
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

  test('room sorting applies immediately without an extra submit action', async ({ page }) => {
    await page.goto('/rooms');

    await page.getByLabel('Sắp xếp').selectOption('price');
    await expect(page).toHaveURL(/ordering=price/);
    await expect(page.getByRole('button', { name: 'Áp dụng' })).toHaveCount(0);
  });

  test('large room inventories paginate without duplicate page controls', async ({ page }) => {
    await page.goto('/rooms?search=pagination-125&page=21');

    await expect(page.locator('[data-room-card]')).toHaveCount(5);
    await expect(page.getByRole('heading', { name: '125 phòng phù hợp · trang 21' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Trang 21' })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Trang 21' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Trang sau' })).toHaveAttribute('aria-disabled', 'true');
  });

  test('rooms can be compared from the listing without changing pages', async ({ page }) => {
    await page.goto('/rooms?search=visual-12');

    const panel = page.locator('[data-compare-panel]');
    const compareCards = panel.locator('[data-compare-card]');
    const toggles = page.locator('[data-compare-toggle]');

    await expect(panel).toBeVisible();
    await expect(toggles).toHaveCount(6);
    await expect(compareCards).toHaveCount(0);

    await toggles.nth(0).click();
    await expect(toggles.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(compareCards).toHaveCount(0);

    await toggles.nth(1).click();
    await expect(compareCards).toHaveCount(2);
    await expect(panel.locator('a[href="/rooms/e2e-room-1"]')).toBeVisible();
    await expect(panel.locator('a[href="/rooms/e2e-room-2"]')).toBeVisible();

    await panel.locator('[data-compare-clear]').click();
    await expect(compareCards).toHaveCount(0);
    await expect(toggles.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(toggles.nth(1)).toHaveAttribute('aria-pressed', 'false');
  });

  test('large cẩm nang inventories paginate without duplicate page controls', async ({ page }) => {
    await page.goto('/blogs?page=4');

    await expect(page.getByRole('heading', { name: 'Cam nang thue phong 22' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Trang 4' })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Trang 4' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Trang sau' })).toHaveAttribute('aria-disabled', 'true');
  });

  test('back navigation preserves room filters and scroll position', async ({ page }) => {
    await page.goto('/rooms?search=visual-12&page=2&ordering=price');
    const target = page.locator('[data-room-card]').nth(2);
    await target.scrollIntoViewIfNeeded();
    const previousScrollY = await page.evaluate(() => window.scrollY);
    await target.getByRole('link', { name: 'Xem chi tiết và đặt lịch' }).click();
    await expect(page).toHaveURL(/\/rooms\/e2e-room-9$/);

    await page.goBack();
    await expect(page).toHaveURL(/search=visual-12/);
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/ordering=price/);
    await expect(page.getByRole('link', { name: 'Bỏ lọc Từ khóa: visual-12' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(Math.max(0, previousScrollY - 120));
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
    await expect(filterForm.locator('select[name="room_type"]')).not.toHaveCount(0);
    await expect(advanced.locator('select[name="room_type"]')).toHaveCount(0);
    await advanced.locator('summary').click();
    await expect(advanced).toHaveAttribute('open', '');
    await expect(advanced.locator('select[name="ward"]')).toBeVisible();
    await filterForm.locator('select[name="room_type"]').selectOption('CCDV');
    await expect(filterForm.locator('select[name="room_subtype"]')).toBeVisible();
    await expect(filterForm.locator('select[name="room_subtype"] option')).toContainText(['Tất cả kiểu phòng', 'Studio']);

    const amenityLabel = advanced.locator('label').first();
    const box = await amenityLabel.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  });

  test('room cards group decision costs and allow long prices to wrap', async ({ page }) => {
    await page.goto('/rooms?search=visual-12');

    const firstCard = page.locator('[data-room-card]').first();
    const costs = firstCard.locator('[data-room-cost-summary]');
    await expect(costs).toContainText('Giá thuê');
    await expect(costs).toContainText('Cọc');
    await expect(costs).toContainText('Phí cố định/tháng');
    await expect(costs).toContainText('Điện / nước');
    await expect(firstCard.locator('[data-room-price]')).not.toHaveClass(/whitespace-nowrap/);
  });

  test('room gallery adapts to zero, one, and multiple images', async ({ page }) => {
    await page.goto('/rooms/e2e-room');
    await expect(page.locator('[data-image-count="0"]')).toContainText('Ảnh và video phòng đang được cập nhật');
    await expect(page.getByRole('button', { name: 'Nội dung tiếp theo' })).toHaveCount(0);

    await page.goto('/rooms/e2e-room-one');
    const oneImageGallery = page.locator('[data-image-count="1"]');
    await expect(oneImageGallery).toHaveCount(1);
    await expect(oneImageGallery).toBeVisible();
    await page.getByRole('button', { name: /Xem Toàn cảnh/ }).click();
    await expect(page.getByRole('button', { name: 'Nội dung tiếp theo' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Đóng thư viện' }).click();

    await page.goto('/rooms/e2e-room-many');
    const manyImageGallery = page.locator('[data-image-count="3"]');
    await expect(manyImageGallery).toHaveCount(1);
    await expect(manyImageGallery).toBeVisible();
    await expect(manyImageGallery).toContainText('3 ảnh');
    await expect(manyImageGallery).toContainText('Toàn cảnh');
    await page.getByRole('button', { name: /Xem Toàn cảnh/ }).click();
    await expect(page.getByRole('button', { name: 'Nội dung tiếp theo' })).toBeVisible();
  });

  test('room gallery keeps the current image visible while Cloudinary decodes the next image', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#9a5b31"/></svg>';
    const optimizedCloudinaryRequests: string[] = [];
    let releaseSecondImage = () => {};
    const secondImageGate = new Promise<void>((resolve) => {
      releaseSecondImage = resolve;
    });

    await page.route('**/_next/image?**', async (route) => {
      if (decodeURIComponent(route.request().url()).includes('res.cloudinary.com')) {
        optimizedCloudinaryRequests.push(route.request().url());
      }
      await route.fulfill({ body: svg, contentType: 'image/svg+xml' });
    });
    await page.route('https://res.cloudinary.com/**', async (route) => {
      if (route.request().url().includes('e2e-room-2')) await secondImageGate;
      await route.fulfill({ body: svg, contentType: 'image/svg+xml' });
    });

    await page.goto('/rooms/e2e-room-cloudinary');
    const gallery = page.locator('[data-image-count="3"]');
    await expect.poll(() => gallery.locator('img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const openedAt = Date.now();
    await gallery.locator('button').first().click();

    const dialog = page.getByRole('dialog');
    const activeImage = dialog.locator('img').first();
    await expect(activeImage).toHaveAttribute('alt', /Toàn cảnh/);
    await expect(activeImage).toHaveAttribute('srcset', /w_480.*w_768.*w_960.*w_1200/);
    expect(Date.now() - openedAt).toBeLessThan(1000);
    const startedAt = Date.now();
    await page.getByRole('button', { name: 'Nội dung tiếp theo' }).click();
    await expect(dialog.getByRole('status')).toContainText('Đang tải nội dung');
    await expect(activeImage).toHaveAttribute('alt', /Toàn cảnh/);

    await page.waitForTimeout(400);
    releaseSecondImage();
    await expect(activeImage).toHaveAttribute('alt', /Bếp/);
    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(optimizedCloudinaryRequests).toEqual([]);
  });

  test('room gallery provides desktop thumbnails and mobile swipe navigation', async ({ page }) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#9a5b31"/></svg>';
    await page.route('**/_next/image?**', (route) => route.fulfill({ body: svg, contentType: 'image/svg+xml' }));
    await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ body: svg, contentType: 'image/svg+xml' }));

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/rooms/e2e-room-cloudinary');
    await page.locator('[data-image-count="3"] button').first().click();
    const desktopDialog = page.getByRole('dialog');
    await expect(desktopDialog.getByLabel('Chọn nội dung')).toBeVisible();
    await expect(desktopDialog.getByLabel('Chọn nội dung').getByRole('button')).toHaveCount(3);
    const thumbnails = desktopDialog.getByLabel('Chọn nội dung').locator('img');
    await expect(thumbnails).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect(thumbnails.nth(index)).toHaveAttribute('src', /w_160/);
    }

    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.locator('[data-image-count="3"] button').first().click();
    const mobileDialog = page.getByRole('dialog');
    const activeImage = mobileDialog.locator('img').first();
    const stage = mobileDialog.locator('[data-gallery-stage]');
    await stage.dispatchEvent('pointerdown', { clientX: 320, pointerId: 1, pointerType: 'touch' });
    await stage.dispatchEvent('pointerup', { clientX: 40, pointerId: 1, pointerType: 'touch' });
    await expect(activeImage).toHaveAttribute('alt', /Bếp/);
    await expect(mobileDialog.getByLabel('Chọn nội dung')).toBeHidden();
  });

  test('room gallery renders uploaded videos with native playback controls', async ({ page }) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#9a5b31"/></svg>';
    await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ body: svg, contentType: 'image/svg+xml' }));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/rooms/e2e-room-cloudinary');

    const videoTile = page.getByRole('button', { name: /Xem video/ });
    await expect(videoTile).toBeVisible();
    await videoTile.click();

    const video = page.getByRole('dialog').locator('video[controls]');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('playsinline', '');
  });

  test('room gallery opens cached image and video previews within 60ms', async ({ page }) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#9a5b31"/></svg>';
    await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ body: svg, contentType: 'image/svg+xml' }));
    await page.goto('/rooms/e2e-room-cloudinary');
    await expect(page.locator('[data-testid="site-nav"]:visible').first()).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
    await expect.poll(() => page.locator('[data-media-count] img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

    const imageMs = await page.evaluate(async () => {
      const button = document.querySelector<HTMLButtonElement>('[data-media-count] button');
      if (!button) throw new Error('Image gallery button is missing.');
      const startedAt = performance.now();
      button.click();
      while (true) {
        await new Promise(requestAnimationFrame);
        const image = document.querySelector<HTMLImageElement>('[role="dialog"] [data-gallery-stage] > img');
        if (image?.complete && image.naturalWidth > 0) {
          await new Promise(requestAnimationFrame);
          return performance.now() - startedAt;
        }
      }
    });
    expect(imageMs).toBeLessThan(60);

    await page.getByRole('button', { name: 'Đóng thư viện' }).click();
    const videoMs = await page.evaluate(async () => {
      const button = document.querySelector<HTMLButtonElement>('[aria-label^="Xem video"]');
      if (!button) throw new Error('Video gallery button is missing.');
      const startedAt = performance.now();
      button.click();
      while (true) {
        await new Promise(requestAnimationFrame);
        const video = document.querySelector<HTMLVideoElement>('[role="dialog"] [data-gallery-stage] > video');
        if (video?.poster) {
          await new Promise(requestAnimationFrame);
          return performance.now() - startedAt;
        }
      }
    });
    expect(videoMs).toBeLessThan(60);
  });

  test('dialog keyboard focus is trapped and restored to each trigger', async ({ page }) => {
    await page.goto('/rooms/e2e-room-many');
    const galleryTrigger = page.getByRole('button', { name: /Xem Toàn cảnh/ });
    await galleryTrigger.focus();
    await galleryTrigger.press('Enter');
    const galleryDialog = page.getByRole('dialog', { name: /Thư viện ảnh và video/ });
    const galleryClose = galleryDialog.getByRole('button', { name: 'Đóng thư viện' });
    await expect(galleryClose).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(galleryDialog.locator('button:visible').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(galleryClose).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(galleryDialog).toHaveCount(0);
    await expect(galleryTrigger).toBeFocused();

    await page.goto('/rooms/e2e-room');
    await page.getByLabel('Ngày mong muốn').fill('2099-01-15');
    await page.getByLabel('Thời gian').selectOption('morning');
    const requestTrigger = page.getByRole('button', { name: 'Yêu cầu xem ngay' });
    await expect(requestTrigger).toBeEnabled();
    await requestTrigger.focus();
    await requestTrigger.press('Enter');
    const confirmationDialog = page.getByRole('dialog', { name: /Xác nhận yêu cầu xem/ });
    await expect(confirmationDialog.getByRole('button', { name: 'Đóng', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(confirmationDialog).toHaveCount(0);
    await expect(requestTrigger).toBeFocused();

    await mockAdminRoomInventory(page);
    await page.goto(new URL('/admin/rooms', adminBaseURL).toString());
    const addRoomTrigger = page.getByRole('button', { name: 'Thêm phòng', exact: true });
    await expect(addRoomTrigger).toBeEnabled();
    await addRoomTrigger.focus();
    await addRoomTrigger.press('Enter');
    const roomDialog = page.getByRole('dialog', { name: 'Tạo phòng' });
    await expect(roomDialog.getByRole('button', { name: 'Đóng cửa sổ phòng' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(roomDialog).toHaveCount(0);
    await expect(addRoomTrigger).toBeFocused();
  });

  test('admin room form accepts supported video files', async ({ page }) => {
    await mockAdminRoomInventory(page);
    await page.goto(new URL('/admin/rooms', adminBaseURL).toString());
    await expect(page.locator('body')).toContainText('Quản lý phòng');
    await page.getByRole('button', { name: 'Thêm phòng', exact: true }).click();

    const mediaInput = page.locator('input[type="file"][multiple]');
    await expect(mediaInput).toHaveAttribute('accept', /video\/mp4/);
    await mediaInput.setInputFiles({
      name: 'tour.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('\u0000\u0000\u0000\u0018ftypmp42'),
    });
    await expect(page.getByRole('dialog')).toContainText('tour.mp4');
  });

  test('room detail shows water charged per cubic meter', async ({ page }) => {
    await page.goto('/rooms/e2e-room-water-meter');

    const waterFact = page.getByText('Tiền nước / m³').locator('..');
    await expect(waterFact).toContainText('25.000 VNĐ');
  });

  test('admin room form switches the water price input by billing type', async ({ page }) => {
    await mockAdminRoomInventory(page);
    await page.goto(new URL('/admin/rooms', adminBaseURL).toString());
    await expect(page.locator('body')).toContainText('Quản lý phòng');
    await page.getByRole('button', { name: 'Thêm phòng', exact: true }).click();

    await page.getByLabel('Cách tính tiền nước').selectOption('PER_CUBIC_METER');
    await expect(page.getByLabel('Tiền nước / m³')).toBeVisible();
    await expect(page.getByLabel('Tiền nước / người')).toHaveCount(0);
  });

  test('admin can archive a rented room without deleting its history', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await mockAdminRoomInventory(page, [{
      id: 7,
      title: 'Studio S3.02',
      slug: 'studio-s302',
      room_type: 'CCDV',
      room_subtype: 1,
      room_subtype_name: 'Studio',
      city: 1,
      ward: 1,
      address: 'Tay Mo, Ha Noi',
      building_code: 'S3.02',
      price: '5000000.00',
      deposit_type: 1,
      deposit_type_name: 'Coc 1 thang',
      deposit_amount: '5000000.00',
      electricity_price_per_kwh: '4000.00',
      water_billing_type: 'PER_PERSON',
      water_price_per_person: '100000.00',
      water_price_per_cubic_meter: '0.00',
      service_fee: '300000.00',
      actual_area: '25.00',
      area_range: 1,
      amenities: [],
      short_description: '',
      description: 'Room with rental history.',
      thumbnail: null,
      status: 'RENTED',
      commission_percent: '0.00',
      commission_base_amount: '0.00',
      estimated_commission_amount: '0.00',
      internal_note: '',
      created_by: 1,
      created_by_name: 'ForRent Admin',
      images: [],
      created_at: '2026-07-10T08:00:00Z',
      updated_at: '2026-07-10T08:00:00Z',
    }]);
    await page.goto(new URL('/admin/rooms', adminBaseURL).toString());

    await expect.poll(() => pageErrors).toEqual([]);
    await expect(page.getByRole('button', { name: /L.u tr. Studio S3\.02/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /X.a Studio S3\.02/ })).toHaveCount(0);
  });

  test('room detail replaces operational room codes with a renter-facing title', async ({ page }) => {
    await page.goto('/rooms/e2e-room-operational-title');

    await expect(page.getByRole('heading', { name: /Chung c. mini m.i tinh/, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /P801|Khai tr..ng|Si.u ph.m|CCMN|🎉/, level: 1 })).toHaveCount(0);
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

  test('contact form keeps user input when the API is temporarily unavailable', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/contact', async (route) => {
      requestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        body: JSON.stringify({ success: false, message: 'Dịch vụ tạm thời gián đoạn.', errors: {} }),
        contentType: 'application/json',
        status: 503,
      });
    });
    await page.goto('/contact');

    await page.getByLabel('Họ và tên').fill('Nguyen Van A');
    await page.getByLabel('Địa chỉ email').fill('tenant@example.com');
    await page.getByLabel('Số điện thoại').fill('+84 912 345 678');
    await page.getByLabel('Lời nhắn').fill('Can tim phong gan Tay Mo.');
    await page.getByRole('button', { name: 'Gửi nhu cầu thuê phòng' }).dblclick();

    await expect(page.getByLabel('Họ và tên')).toHaveValue('Nguyen Van A');
    await expect(page.getByLabel('Số điện thoại')).toHaveValue('+84 912 345 678');
    await expect(page.getByRole('button', { name: 'Gửi nhu cầu thuê phòng' })).toBeEnabled();
    expect(requestCount).toBe(1);
  });

  test('room detail booking panel is reachable', async ({ page }) => {
    await page.goto('/rooms');

    const firstRoom = page.getByRole('link', { name: 'Xem chi tiết và đặt lịch' }).first();
    await firstRoom.scrollIntoViewIfNeeded();
    await expect(firstRoom).toBeVisible();
    await firstRoom.click();
    await expect(page).toHaveURL(/\/rooms\/[^/?#]+/);
    await expect(page.getByRole('complementary', { name: 'Tư vấn và đặt lịch xem phòng' })).toBeVisible();
  });

  test('viewing request shows the pending confirmation state after submission', async ({ page }) => {
    await page.route('**/api/viewing-requests', (route) => route.fulfill({
      body: JSON.stringify({ success: true, message: 'Yêu cầu xem phòng đã được ghi nhận.', data: { id: 101 } }),
      contentType: 'application/json',
      status: 201,
    }));
    await page.goto('/rooms/e2e-room');

    await page.getByLabel('Ngày mong muốn').fill('2099-01-15');
    await page.getByLabel('Thời gian').selectOption('morning');
    await page.getByRole('button', { name: 'Yêu cầu xem ngay' }).click();
    await expect(page.getByRole('dialog', { name: /Xác nhận yêu cầu xem/ })).toBeVisible();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();

    const submittedState = page.getByTestId('viewing-request-submitted');
    await expect(submittedState).toContainText('Yêu cầu đã được ghi nhận');
    await expect(submittedState).toContainText('Nhân viên tư vấn sẽ liên hệ');
    await expect(page.getByRole('link', { name: 'Theo dõi yêu cầu' })).toBeVisible();
  });

  test('viewing request keeps the selected schedule when the API fails', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/viewing-requests', async (route) => {
      requestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        body: JSON.stringify({ success: false, message: 'Dịch vụ tạm thời gián đoạn.', errors: {} }),
        contentType: 'application/json',
        status: 503,
      });
    });
    await page.goto('/rooms/e2e-room');

    await page.getByLabel('Ngày mong muốn').fill('2099-01-15');
    await page.getByLabel('Thời gian').selectOption('afternoon');
    await page.getByRole('button', { name: 'Yêu cầu xem ngay' }).click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).dblclick();

    await expect(page.getByLabel('Ngày mong muốn')).toHaveValue('2099-01-15');
    await expect(page.getByLabel('Thời gian')).toHaveValue('afternoon');
    await expect(page.getByRole('button', { name: 'Yêu cầu xem ngay' })).toBeEnabled();
    expect(requestCount).toBe(1);
  });

  test('expired session preserves viewing request input and explains the next step', async ({ page }) => {
    await page.route('**/api/viewing-requests', (route) => route.fulfill({
      body: JSON.stringify({ success: false, message: 'Phiên đăng nhập đã hết hạn.', errors: {} }),
      contentType: 'application/json',
      status: 401,
    }));
    await page.goto('/rooms/e2e-room');

    await page.getByLabel('Ngày mong muốn').fill('2099-01-15');
    await page.getByLabel('Thời gian').selectOption('evening');
    await page.getByRole('button', { name: 'Yêu cầu xem ngay' }).click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();

    await expect(page.getByText(/Vui lòng đăng nhập tài khoản khách thuê/).first()).toBeVisible();
    await expect(page.getByLabel('Ngày mong muốn')).toHaveValue('2099-01-15');
    await expect(page.getByLabel('Thời gian')).toHaveValue('evening');
    await expect(page.getByRole('button', { name: 'Yêu cầu xem ngay' })).toBeEnabled();
  });

  test('gallery exposes recoverable image and video errors when the CDN is unavailable', async ({ page }) => {
    await page.route('https://res.cloudinary.com/**', (route) => route.abort('failed'));
    await page.goto('/rooms/e2e-room-cloudinary');

    await expect(page.getByText('Không tải được ảnh').first()).toBeVisible();
    await page.getByRole('button', { name: /Xem video/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Không tải được nội dung' })).toBeVisible();
  });

  test('legacy room detail URL permanently redirects to the clean URL', async ({ page }) => {
    await page.goto('/room-details?slug=e2e-room');

    await expect(page).toHaveURL(/\/rooms\/e2e-room$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Accessibility basics', () => {
  test('admin remains light-only when an old dark preference exists', async ({ page }) => {
    await mockAdminDashboard(page);
    await page.addInitScript(() => localStorage.setItem('forrent-admin-theme', 'dark'));
    await page.goto(new URL('/admin', adminBaseURL).toString());

    await expect(page.locator('html')).toHaveClass('light');
    await expect(page.getByRole('group', { name: /Ch.n giao di.n/ })).toHaveCount(0);
  });

  test('admin dashboard starts with a workflow queue', async ({ page }) => {
    await mockAdminDashboard(page);
    await page.goto(new URL('/admin', adminBaseURL).toString());

    const queue = page.locator('[data-work-queue]');
    await expect(queue).toBeVisible();
    await expect(queue.getByRole('heading', { name: 'Việc cần xử lý' })).toBeVisible();
    await expect(queue).toContainText('Yêu cầu chưa liên hệ');
    await expect(queue).toContainText('Lịch xem hôm nay');
    await expect(queue).toContainText('Phòng cần cập nhật');
    await expect(queue).toContainText('Media cần kiểm tra');
  });

  test('admin work queue opens the uncontacted lead filter', async ({ page }) => {
    await mockAdminDashboard(page);
    let requestedStatus = '';
    await page.route('**/api/admin/viewing-requests**', (route) => {
      requestedStatus = new URL(route.request().url()).searchParams.get('status') ?? '';
      route.fulfill({ json: { success: true, message: 'OK', data: { count: 0, next: null, previous: null, results: [] } } });
    });
    for (const resource of ['cities', 'wards', 'users']) {
      await page.route(`**/api/admin/${resource}**`, (route) =>
        route.fulfill({ json: { success: true, message: 'OK', data: { count: 0, next: null, previous: null, results: [] } } }),
      );
    }
    await page.goto(new URL('/admin', adminBaseURL).toString());
    await page.getByRole('link', { name: /Yêu cầu chưa liên hệ/ }).click();

    await expect(page).toHaveURL(/\/admin\/leads\?status=NEW$/);
    await expect(page.getByLabel('Lọc yêu cầu theo trạng thái')).toHaveValue('NEW');
    await expect.poll(() => requestedStatus).toBe('NEW');
  });

  test('admin calendar uses agenda as the mobile primary view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAdminCalendar(page);
    await page.goto(new URL('/admin/calendar', adminBaseURL).toString());

    await expect(page.locator('[data-calendar-view="agenda"]')).toBeVisible();
    await expect(page.locator('[data-calendar-view="month-grid"]')).toBeHidden();
  });

  test('mobile footer uses compact disclosures and keeps direct contact visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: /0914032706/ })).toBeVisible();
    await expect(footer.getByRole('link', { name: /support@forrent.io.vn/ })).toBeVisible();
    await expect(footer.locator('details')).toHaveCount(3);
    await expect(footer.locator('summary').filter({ hasText: 'Dịch vụ' })).toBeVisible();
    await expect(footer.locator('summary').filter({ hasText: 'Hỗ trợ' })).toBeVisible();
    await expect(footer.locator('summary').filter({ hasText: 'Pháp lý' })).toBeVisible();
  });

  test('root clips horizontal paint overflow without creating a scroll container', async ({ page }) => {
    await page.goto('/rooms');

    const overflow = await page.evaluate(() => ({
      body: getComputedStyle(document.body).overflowX,
      html: getComputedStyle(document.documentElement).overflowX,
    }));
    expect(overflow).toEqual({ body: 'clip', html: 'clip' });
  });

  test('marketplace layouts do not leak past 320, 375, or 414 pixel viewports', async ({ page }) => {
    const routes = ['/', '/rooms', '/rooms/e2e-room-many', '/contact'];

    for (const width of [320, 375, 414]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('[data-testid="site-nav"]:visible').first()).toHaveAttribute('data-ready', 'true');
        const overflow = await page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          return Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .filter((element) => {
              const style = getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
            })
            .slice(0, 8)
            .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${Array.from(element.classList).slice(0, 3).join('.')}`);
        });
        expect(overflow, `${route} overflowed at ${width}px`).toEqual([]);
      }
    }
  });

  test('homepage visible buttons meet 44px touch target', async ({ page }) => {
    await page.goto('/');

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
    await page.goto('/');
    await page.keyboard.press('Tab');

    await expect(page.locator(':focus')).toBeVisible();
  });

  test('auth and filter actions meet the 44px touch target', async ({ page }) => {
    const targets: Array<{ path: string; labels: string[] }> = [
      { path: '/log-in', labels: ['Quên mật khẩu?', 'Đăng ký'] },
      { path: '/sign-up', labels: ['Gửi mã', 'Đăng nhập'] },
      { path: '/rooms?search=test', labels: ['Xóa tất cả', 'Xem chi tiết và đặt lịch'] },
    ];

    for (const target of targets) {
      await page.goto(target.path);
      for (const label of target.labels) {
        const control = page.getByRole('link', { name: label, exact: true }).or(page.getByRole('button', { name: label, exact: true })).first();
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
      }
    }
  });

  test('key layouts remain usable at a 200 percent zoom equivalent', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    for (const path of ['/', '/rooms', '/contact', '/log-in', '/sign-up']) {
      await page.goto(path);
      await expect(page.locator('#main-content')).toBeVisible();
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(hasOverflow).toBe(false);
    }
  });

  test('reduced motion preference suppresses decorative transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    const duration = await page.getByTestId('site-nav').evaluate((element) => getComputedStyle(element).transitionDuration);
    const longestDuration = Math.max(...duration.split(',').map((value) => Number.parseFloat(value) || 0));
    expect(longestDuration).toBeLessThanOrEqual(0.001);
  });
});
