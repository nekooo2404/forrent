import { expect, test } from '@playwright/test';

import { mockAdminDashboard, mockAdminRoomInventory } from './admin-mocks';
import { mockLandlordWorkspace } from './landlord-mocks';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

test('homepage visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('main')).toHaveScreenshot('homepage-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('homepage mobile hero visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const hero = page.getByTestId('homepage-hero');
  await expect.poll(() => hero.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(hero).toHaveScreenshot('homepage-mobile-hero-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('desktop navbar visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.goto('/');
  await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('site-nav')).toHaveScreenshot('desktop-navbar-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('mobile menu visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.locator('.site-menu-button').click();
  await expect(page.locator('.site-mobile-menu')).toBeVisible();
  await expect(page.locator('.site-mobile-menu')).toHaveScreenshot('mobile-menu-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms listing visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.goto('/rooms');
  await expect(page.locator('[data-room-card]:visible').first()).toHaveAttribute('data-layout', 'wide');
  const themedOption = page.getByRole('option', { name: 'Tất cả phường' });
  await expect(themedOption).toHaveCSS('background-color', 'rgb(255, 255, 253)');
  await expect(themedOption).toHaveCSS('color', 'rgb(42, 35, 31)');
  await expect(page.locator('main')).toHaveScreenshot('rooms-list-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms mobile visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rooms');
  await expect(page.getByRole('button', { name: 'Lọc phòng' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveScreenshot('rooms-list-light-mobile.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('room card remains readable at 320px visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the Chromium project only.');

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/rooms');
  const card = page.locator('[data-room-card]').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveScreenshot('room-card-light-mobile-320.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms grid with six results visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/rooms?search=visual-12');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-testid="site-nav"]:visible').first()).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('[data-room-card]')).toHaveCount(6);
  await expect(page).toHaveScreenshot('rooms-list-6-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms empty state visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/rooms?search=visual-empty');
  await expect(page.getByRole('heading', { name: 'Chưa có phòng phù hợp' })).toBeVisible();
  await expect(page).toHaveScreenshot('rooms-empty-light-tablet.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('contact page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/contact');
  await expect(page.locator('[data-testid="site-nav"]:visible').first()).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Gửi nhu cầu thuê phòng' })).toBeVisible();
  await expect(page.locator('main')).toHaveScreenshot('contact-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('login page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/log-in');
  await expect(page.locator('form')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('main')).toHaveScreenshot('login-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('admin login page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(new URL('/log-in', adminBaseURL).toString());
  await expect(page.locator('form')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('main')).toHaveScreenshot('admin-login-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('admin login mobile visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the Chromium project only.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('/log-in', adminBaseURL).toString());
  await expect(page.locator('form')).toHaveAttribute('data-ready', 'true');
  await expect(page).toHaveScreenshot('admin-login-light-mobile.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('admin dashboard visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await mockAdminDashboard(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(new URL('/admin', adminBaseURL).toString());
  await expect(page.locator('#admin-main')).toContainText('Tổng quan vận hành');
  await expect(page.locator('#admin-main')).toContainText('Yêu cầu');
  await expect(page.locator('#admin-main')).toContainText('Hoa');
  await expect(page).toHaveScreenshot('admin-dashboard-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('admin create room modal visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await mockAdminRoomInventory(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('/admin/rooms', adminBaseURL).toString());
  await page.getByRole('button', { name: 'Thêm phòng', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo phòng' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveScreenshot('admin-create-room-modal-light-mobile.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('room detail visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.goto('/rooms/e2e-room');
  await expect(page.getByRole('complementary', { name: 'Tư vấn và đặt lịch xem phòng' })).toBeVisible();
  await expect(page).toHaveScreenshot('room-detail-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('room gallery states visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1024, height: 768 });
  for (const [slug, count] of [['e2e-room', 0], ['e2e-room-one', 1], ['e2e-room-many', 3]] as const) {
    await page.goto(`/rooms/${slug}`);
    const gallery = page.locator(`[data-image-count="${count}"]`);
    await expect(gallery).toHaveCount(1);
    await expect(gallery).toBeVisible();
    await expect(gallery).toHaveScreenshot(`room-gallery-${count}-light.png`, {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    });
  }
});

const landlordViewports = [
  { name: 'mobile-320', width: 320, height: 844 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 1000 },
] as const;

for (const viewport of landlordViewports) {
  test(`landlord work queue visual regression ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Landlord snapshots are tracked in Chromium only.');
    await mockLandlordWorkspace(page);
    await page.setViewportSize(viewport);
    await page.goto('/landlord');
    await expect(page.getByRole('heading', { name: 'Việc cần xử lý' })).toBeVisible();
    await expect(page.locator('main')).toHaveScreenshot(`landlord-dashboard-${viewport.name}.png`, { maxDiffPixelRatio: 0.01, threshold: 0.2 });
  });

  for (const [name, path, heading] of [
    ['rooms', '/landlord/rooms', 'Quản lý phòng của bạn'],
    ['requests', '/landlord/viewing-requests', 'Yêu cầu xem phòng'],
    ['calendar', '/landlord/calendar', 'Lịch xem phòng'],
    ['commissions', '/landlord/commissions', 'Hoa hồng'],
  ] as const) {
    test(`landlord ${name} visual regression ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Landlord snapshots are tracked in Chromium only.');
      await mockLandlordWorkspace(page, name === 'commissions' ? 'INDEPENDENT_SALER' : 'LANDLORD');
      await page.setViewportSize(viewport);
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.locator('main')).toHaveScreenshot(`landlord-${name}-${viewport.name}.png`, { maxDiffPixelRatio: 0.01, threshold: 0.2 });
    });
  }

  test(`landlord room form visual regression ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Landlord snapshots are tracked in Chromium only.');
    await mockLandlordWorkspace(page);
    await page.setViewportSize(viewport);
    await page.goto('/landlord/rooms');
    await page.getByRole('button', { name: 'Thêm phòng', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm phòng mới' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveScreenshot(`landlord-room-form-${viewport.name}.png`, { maxDiffPixelRatio: 0.01, threshold: 0.2 });
  });

  test(`landlord notification popover visual regression ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Landlord snapshots are tracked in Chromium only.');
    await mockLandlordWorkspace(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByTestId('landlord-notification-bell').click();
    const popover = page.locator('#landlord-notification-popover');
    await expect(popover).toBeVisible();
    await expect(popover).toHaveScreenshot(`landlord-notifications-${viewport.name}.png`, { maxDiffPixelRatio: 0.01, threshold: 0.2 });
  });
}
