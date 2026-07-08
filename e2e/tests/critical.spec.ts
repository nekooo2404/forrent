import { expect, test } from '@playwright/test';

test.describe('Public critical flows', () => {
  test('homepage nav, theme toggle, and scroll state work', async ({ page }) => {
    await page.goto('/homepage');

    await expect(page).toHaveTitle(/ForRent/);
    await expect(page.getByTestId('site-nav')).toBeVisible();
    await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
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

    await page.evaluate(() => window.scrollTo(0, 120));
    await expect(page.getByTestId('site-nav')).toHaveClass(/site-navbar-scrolled/);
  });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/homepage');
    await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.site-menu-button')).toBeVisible();

    await page.locator('.site-menu-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeVisible();
    await expect(page.locator('.site-mobile-menu a[href="/rooms"]')).toBeVisible();

    await page.locator('.site-close-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeHidden();
  });

  test('rooms filters submit stable query params', async ({ page }) => {
    await page.goto('/rooms');

    const filterForm = page.locator('form[action="/rooms"]').filter({ has: page.locator('input[name="search"]') });
    await expect(filterForm).toBeVisible();
    await filterForm.locator('input[name="search"]').fill('test');
    await filterForm.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/search=test/);
  });

  test('ward filter stays disabled until a city is selected', async ({ page }) => {
    await page.goto('/rooms');

    const wardSelect = page.locator('select[name="ward"]');
    if ((await wardSelect.count()) === 0) {
      test.skip(true, 'No ward filter is rendered without backend filter data.');
    }

    await expect(wardSelect).toBeDisabled();
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

  test('room detail booking panel is reachable when rooms exist', async ({ page }) => {
    await page.goto('/rooms');

    const firstRoom = page.locator('a[href^="/rooms/"]').first();
    if (!(await firstRoom.isVisible().catch(() => false))) {
      test.skip(true, 'No rooms are rendered from backend data.');
    }

    await firstRoom.click();
    await expect(page).toHaveURL(/\/rooms\/[^/?#]+/);
    await expect(page.locator('#dat-lich-xem')).toBeVisible();
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
