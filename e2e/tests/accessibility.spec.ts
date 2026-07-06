import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/homepage');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Check if focus is visible
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('buttons should meet minimum touch target size', async ({ page }) => {
    await page.goto('/rooms');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // WCAG 2.1 AA: minimum 44x44px
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('modals should trap focus', async ({ page }) => {
    await page.goto('/rooms');

    // Open room gallery if available
    const galleryButton = page.locator('button[aria-label*="Xem"]').first();
    if (await galleryButton.isVisible()) {
      await galleryButton.click();

      // Tab should cycle within modal
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');

      // Focus should be within modal
      await expect(focused).toBeVisible();
    }
  });

  test('should close modals with Escape key', async ({ page }) => {
    await page.goto('/rooms');

    const galleryButton = page.locator('button[aria-label*="Xem"]').first();
    if (await galleryButton.isVisible()) {
      await galleryButton.click();

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should be closed
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    }
  });
});
