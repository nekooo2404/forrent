import { expect, test } from '@playwright/test';

test('desktop navbar visual regression', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Screenshot baseline is tracked for Chromium only.');

  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/homepage');
  await expect(page.getByTestId('site-nav')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('site-nav')).toHaveScreenshot('desktop-navbar-dark.png', {
    maxDiffPixelRatio: 0.03,
    threshold: 0.2,
  });
});

test('mobile menu visual regression', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Screenshot baseline is tracked for Chromium only.');

  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/homepage');
  await page.locator('.genz-menu-button').click();
  await expect(page.locator('.genz-mobile-menu')).toBeVisible();
  await expect(page.locator('.genz-mobile-menu')).toHaveScreenshot('mobile-menu-dark.png', {
    maxDiffPixelRatio: 0.03,
    threshold: 0.2,
  });
});
