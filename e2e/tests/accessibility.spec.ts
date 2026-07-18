import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { mockAdminDashboard, mockAdminRoomInventory, mockAdminWorkspace } from './admin-mocks';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';
const publicPaths = ['/', '/rooms', '/blogs', '/contact', '/privacy', '/terms', '/log-in', '/sign-up', '/forget-password'];
const adminPaths = ['/log-in'];
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

async function auditMobileLayout(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const overflow = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
      })
      .slice(0, 10)
      .map((element) => element.getAttribute('aria-label') || element.id || element.className || element.tagName);

    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      'button, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea, summary, [role="button"], a',
    ));
    const smallTargets = controls
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || element.matches(':disabled')) return false;
        if (element instanceof HTMLAnchorElement && style.display === 'inline') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      })
      .slice(0, 20)
      .map((element) => ({
        label: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) || element.tagName,
        size: `${Math.round(element.getBoundingClientRect().width)}x${Math.round(element.getBoundingClientRect().height)}`,
      }));

    return { overflow, smallTargets };
  });
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
  for (const viewport of viewports) {
    test(`axe accessibility audit passes on admin ${path} light ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project; viewports are set inside the test.');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(new URL(path, adminBaseURL).toString());
      await settleForAxe(page);

      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations).toEqual([]);
    });
  }
}

for (const viewport of viewports) {
  test(`axe accessibility audit passes on admin dashboard light ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project; viewports are set inside the test.');

    await mockAdminDashboard(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(new URL('/admin', adminBaseURL).toString());
    await expect(page.locator('#admin-main')).toContainText('Tổng quan vận hành');
    await settleForAxe(page);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('axe accessibility audit passes on admin create room modal light mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project.');

  await mockAdminRoomInventory(page);
  await page.setViewportSize({ width: 390, height: 844 });
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

test('axe accessibility audit passes on the rooms empty state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project.');

  await page.goto('/rooms?search=visual-empty');
  await expect(page.getByRole('heading', { name: 'Chưa có phòng phù hợp' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('axe accessibility audit passes on the gallery modal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project.');

  await page.goto('/rooms/e2e-room-many');
  await page.getByRole('button', { name: /Xem .*ảnh chính/ }).click();
  const dialog = page.getByRole('dialog', { name: /Thư viện ảnh và video/ });
  await expect(dialog).toBeVisible();
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(results.violations).toEqual([]);
});

test('axe accessibility audit passes on the viewing request confirmation modal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project.');

  await page.goto('/rooms/e2e-room');
  await page.getByLabel('Ngày mong muốn').fill('2099-01-15');
  await page.getByLabel('Thời gian').selectOption('morning');
  await page.getByRole('button', { name: 'Yêu cầu xem ngay' }).click();
  const dialog = page.getByRole('dialog', { name: /Xác nhận yêu cầu xem/ });
  await expect(dialog).toBeVisible();
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(results.violations).toEqual([]);
});

for (const path of ['/admin/rooms', '/admin/leads', '/admin/calendar', '/admin/contacts', '/admin/blogs', '/admin/commissions', '/admin/users', '/admin/settings']) {
  for (const viewport of [viewports[0], viewports[3]]) {
    test(`axe accessibility audit passes on ${path} light ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Run axe once in the desktop Chromium project; viewports are set inside the test.');

      await mockAdminWorkspace(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(new URL(path, adminBaseURL).toString());
      await expect(page.locator('#admin-main')).toBeVisible();
      await settleForAxe(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test('public mobile routes have no horizontal overflow or undersized controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run the full mobile layout audit once in Chromium.');

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [...publicPaths, '/rooms/e2e-room-many']) {
      await page.goto(path);
      await settleForAxe(page);
      expect(await auditMobileLayout(page), `${path} at ${width}px`).toEqual({ overflow: [], smallTargets: [] });
    }
  }
});

test('admin mobile routes have no horizontal overflow or undersized controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run the full mobile layout audit once in Chromium.');
  await mockAdminWorkspace(page);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/log-in', '/admin', '/admin/rooms', '/admin/leads', '/admin/calendar', '/admin/contacts', '/admin/blogs', '/admin/commissions', '/admin/users', '/admin/settings']) {
      await page.goto(new URL(path, adminBaseURL).toString());
      await settleForAxe(page);
      expect(await auditMobileLayout(page), `${path} at ${width}px`).toEqual({ overflow: [], smallTargets: [] });
    }
  }
});
