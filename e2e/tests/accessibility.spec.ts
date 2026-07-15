import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { mockAdminDashboard, mockAdminRoomInventory } from './admin-mocks';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';
const publicPaths = ['/', '/rooms', '/blogs', '/contact', '/privacy', '/terms', '/log-in', '/sign-up', '/forget-password'];
const adminPaths = ['/log-in'];
const adminThemes = ['light', 'dark'] as const;
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

async function settleForAxe(page: Page) {
  await page.waitForLoadState('load');
  await page.waitForTimeout(800);
}

for (const path of publicPaths) {
  for (const viewport of viewports) {
    test(`axe accessibility audit passes on ${path} light ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project; viewports are set inside the test.');

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(path);
      await settleForAxe(page);

      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations).toEqual([]);
    });
  }
}

for (const path of adminPaths) {
  for (const theme of adminThemes) {
    for (const viewport of viewports) {
      test(`axe accessibility audit passes on admin ${path} ${theme} ${viewport.name}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project; viewports are set inside the test.');
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript((selectedTheme) => localStorage.setItem('forrent-admin-theme', selectedTheme), theme);
        await page.goto(new URL(path, adminBaseURL).toString());
        await settleForAxe(page);

        const results = await new AxeBuilder({ page }).analyze();

        expect(results.violations).toEqual([]);
      });
    }
  }
}

for (const theme of adminThemes) {
  for (const viewport of viewports) {
    test(`axe accessibility audit passes on admin dashboard ${theme} ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project; viewports are set inside the test.');

      await mockAdminDashboard(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript((selectedTheme) => localStorage.setItem('forrent-admin-theme', selectedTheme), theme);
      await page.goto(new URL('/admin', adminBaseURL).toString());
      await expect(page.locator('#admin-main')).toContainText('Tổng quan vận hành');
      await settleForAxe(page);

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test('axe accessibility audit passes on admin create room modal dark mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project.');

  await mockAdminRoomInventory(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('forrent-admin-theme', 'dark'));
  await page.goto(new URL('/admin/rooms', adminBaseURL).toString());
  const addRoom = page.getByRole('button', { name: 'Thêm phòng', exact: true });
  await expect(addRoom).toBeEnabled();
  await addRoom.click();
  await expect(page.getByRole('dialog', { name: 'Tạo phòng' })).toBeVisible();
  await settleForAxe(page);

  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(results.violations).toEqual([]);
});

test('axe accessibility audit passes on room detail', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project.');

  await page.goto('/rooms/e2e-room');
  await settleForAxe(page);
  await expect(page.getByRole('complementary', { name: 'Tư vấn và đặt lịch xem phòng' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
