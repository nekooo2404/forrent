import { expect, test } from '@playwright/test';

import { mockAdminRoomInventory } from './admin-mocks';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

test.describe('Public critical flows', () => {
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
        .toBeLessThan(initialNavHeight);
    }
  });

  test('homepage uses a stable brand hero independent of room imagery', async ({ page }) => {
    await page.goto('/');

    const hero = page.getByTestId('homepage-hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('img')).toHaveAttribute('src', /forrent-hero-old-quarter/);
    await expect.poll(() => hero.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(hero.locator('[aria-hidden="true"]').first()).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(hero.getByRole('button', { name: 'Tìm phòng' })).toBeVisible();
    await expect(page.getByText('Phòng mới sẽ được cập nhật tại đây')).toHaveCount(0);
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
    await page.goto('/');
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
    await expect(page.locator('[data-image-count="0"]')).toContainText('Ảnh và video phòng đang được cập nhật');
    await expect(page.getByRole('button', { name: 'Nội dung tiếp theo' })).toHaveCount(0);

    await page.goto('/rooms/e2e-room-one');
    const oneImageGallery = page.locator('[data-image-count="1"]');
    await expect(oneImageGallery).toHaveCount(1);
    await expect(oneImageGallery).toBeVisible();
    await page.getByRole('button', { name: /Xem .*ảnh chính/ }).click();
    await expect(page.getByRole('button', { name: 'Nội dung tiếp theo' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Đóng thư viện' }).click();

    await page.goto('/rooms/e2e-room-many');
    const manyImageGallery = page.locator('[data-image-count="3"]');
    await expect(manyImageGallery).toHaveCount(1);
    await expect(manyImageGallery).toBeVisible();
    await page.getByRole('button', { name: /Xem .*ảnh chính/ }).click();
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
    await expect(activeImage).toHaveAttribute('alt', /ảnh 1/);
    expect(Date.now() - openedAt).toBeLessThan(1000);
    const startedAt = Date.now();
    await page.getByRole('button', { name: 'Nội dung tiếp theo' }).click();
    await expect(dialog.getByRole('status')).toContainText('Đang tải nội dung');
    await expect(activeImage).toHaveAttribute('alt', /ảnh 1/);

    await page.waitForTimeout(400);
    releaseSecondImage();
    await expect(activeImage).toHaveAttribute('alt', /ảnh 2/);
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

    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.locator('[data-image-count="3"] button').first().click();
    const mobileDialog = page.getByRole('dialog');
    const activeImage = mobileDialog.locator('img').first();
    const stage = mobileDialog.locator('[data-gallery-stage]');
    await stage.dispatchEvent('pointerdown', { clientX: 320, pointerId: 1, pointerType: 'touch' });
    await stage.dispatchEvent('pointerup', { clientX: 40, pointerId: 1, pointerType: 'touch' });
    await expect(activeImage).toHaveAttribute('alt', /ảnh 2/);
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
    await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
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

  test('admin room form accepts supported video files', async ({ page }) => {
    await mockAdminRoomInventory(page);
    await page.goto(new URL('/admin/rooms', adminBaseURL).toString());
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
    await page.getByRole('button', { name: 'Thêm phòng', exact: true }).click();

    await page.getByLabel('Cách tính tiền nước').selectOption('PER_CUBIC_METER');
    await expect(page.getByLabel('Tiền nước / m³')).toBeVisible();
    await expect(page.getByLabel('Tiền nước / người')).toHaveCount(0);
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
});
