import { expect, test } from '@playwright/test';

import { mockAdminDashboard, mockAdminRoomInventory } from './admin-mocks';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

test('homepage visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/homepage');
  await expect(page.locator('main')).toHaveScreenshot('homepage-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('homepage dark visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/homepage');
  await expect(page.locator('main')).toHaveScreenshot('homepage-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('desktop navbar visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/homepage');
  await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('site-nav')).toHaveScreenshot('desktop-navbar-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('mobile menu visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/homepage');
  await page.locator('.site-menu-button').click();
  await expect(page.locator('.site-mobile-menu')).toBeVisible();
  await expect(page.locator('.site-mobile-menu')).toHaveScreenshot('mobile-menu-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms listing visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/rooms');
  await expect(page.locator('[data-room-card]:visible').first()).toHaveAttribute('data-layout', 'wide');
  const themedOption = page.getByRole('option', { name: 'Tất cả trạng thái' });
  await expect(themedOption).toHaveCSS('background-color', 'rgb(33, 22, 16)');
  await expect(themedOption).toHaveCSS('color', 'rgb(255, 237, 213)');
  await expect(page.locator('main')).toHaveScreenshot('rooms-list-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms mobile visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/rooms');
  await expect(page.getByRole('button', { name: 'Bộ lọc phòng' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveScreenshot('rooms-list-dark-mobile.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms grid with twelve results visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/rooms?search=visual-12');
  await expect(page.locator('[data-room-card]')).toHaveCount(12);
  await expect(page).toHaveScreenshot('rooms-list-12-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('rooms empty state visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/rooms?search=visual-empty');
  await expect(page.getByRole('heading', { name: 'Chưa có phòng phù hợp' })).toBeVisible();
  await expect(page).toHaveScreenshot('rooms-empty-dark-tablet.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('contact page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/contact');
  await expect(page.locator('main')).toHaveScreenshot('contact-light.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('login page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/log-in');
  await expect(page.locator('main')).toHaveScreenshot('login-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('admin login page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('forrent-admin-theme', 'dark'));
  await page.goto(new URL('/log-in', adminBaseURL).toString());
  await expect(page.locator('main')).toHaveScreenshot('admin-login-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('admin dashboard visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await mockAdminDashboard(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('forrent-admin-theme', 'dark'));
  await page.goto(new URL('/admin', adminBaseURL).toString());
  await expect(page.locator('#admin-main')).toContainText('Tổng quan vận hành');
  await expect(page.locator('#admin-main')).toContainText('Yêu cầu');
  await expect(page.locator('#admin-main')).toContainText('Hoa');
  await expect(page).toHaveScreenshot('admin-dashboard-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('admin create room modal visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await mockAdminRoomInventory(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('forrent-admin-theme', 'dark'));
  await page.goto(new URL('/admin/rooms', adminBaseURL).toString());
  await page.getByRole('button', { name: 'Thêm phòng', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo phòng' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveScreenshot('admin-create-room-modal-dark-mobile.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('room detail visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/rooms/e2e-room');
  await expect(page.getByRole('complementary', { name: 'Tư vấn và đặt lịch xem phòng' })).toBeVisible();
  await expect(page).toHaveScreenshot('room-detail-dark.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test('room gallery states visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));

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
