import { expect, test } from '@playwright/test';

import { mockAdminDashboard, mockAdminRoomInventory } from './admin-mocks';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

test('desktop navbar visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/homepage');
  await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('site-nav')).toHaveScreenshot('desktop-navbar-dark.png', {
    maxDiffPixelRatio: 0.03,
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
    maxDiffPixelRatio: 0.03,
    threshold: 0.2,
  });
});

test('rooms listing visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/rooms');
  await expect(page.locator('main')).toHaveScreenshot('rooms-list-dark.png', {
    maxDiffPixelRatio: 0.04,
    threshold: 0.2,
  });
});

test('contact page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/contact');
  await expect(page.locator('main')).toHaveScreenshot('contact-light.png', {
    maxDiffPixelRatio: 0.04,
    threshold: 0.2,
  });
});

test('login page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/log-in');
  await expect(page.locator('main')).toHaveScreenshot('login-dark.png', {
    maxDiffPixelRatio: 0.04,
    threshold: 0.2,
  });
});

test('admin login page visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('forrent-admin-theme', 'dark'));
  await page.goto(new URL('/log-in', adminBaseURL).toString());
  await expect(page.locator('main')).toHaveScreenshot('admin-login-dark.png', {
    maxDiffPixelRatio: 0.04,
    threshold: 0.2,
  });
});

test('admin dashboard visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await mockAdminDashboard(page);
  await page.addInitScript(() => localStorage.setItem('forrent-admin-theme', 'dark'));
  await page.goto(new URL('/admin', adminBaseURL).toString());
  await expect(page.locator('#admin-main')).toContainText('Dashboard');
  await expect(page.locator('#admin-main')).toHaveScreenshot('admin-dashboard-dark.png', {
    maxDiffPixelRatio: 0.04,
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
  const dialog = page.getByRole('dialog', { name: 'Create room' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveScreenshot('admin-create-room-modal-dark-mobile.png', {
    maxDiffPixelRatio: 0.04,
    threshold: 0.2,
  });
});

test('room detail visual regression', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Screenshot baseline is tracked for the desktop Chromium project only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/rooms/e2e-room');
  await expect(page.getByRole('complementary', { name: 'Tư vấn và đặt lịch xem phòng' })).toBeVisible();
  await expect(page).toHaveScreenshot('room-detail-dark.png', {
    maxDiffPixelRatio: 0.04,
    threshold: 0.2,
  });
});
