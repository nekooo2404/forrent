import { test, expect } from '@playwright/test';

test.describe('Room Listing', () => {
  test('should display room filters', async ({ page }) => {
    await page.goto('/rooms');

    // Check filter sidebar
    await expect(page.getByRole('heading', { name: 'Bộ lọc' })).toBeVisible();
    await expect(page.getByLabel('Tìm kiếm phòng')).toBeVisible();

    // Check filter button
    await expect(page.getByRole('button', { name: 'Áp dụng bộ lọc' })).toBeVisible();
  });

  test('should filter rooms by city', async ({ page }) => {
    await page.goto('/rooms');

    // Select a city (if available)
    const cityOption = page.locator('input[name="city"]').first();
    if (await cityOption.isVisible()) {
      await cityOption.click();
      await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();

      // URL should update with filter
      await expect(page).toHaveURL(/city=/);
    }
  });

  test('ward dropdown should be disabled without city', async ({ page }) => {
    await page.goto('/rooms');

    const wardSelect = page.locator('select[name="ward"]');
    if (await wardSelect.isVisible()) {
      await expect(wardSelect).toBeDisabled();
    }
  });
});

test.describe('Room Detail', () => {
  test('should display room details', async ({ page }) => {
    // Navigate to rooms page first
    await page.goto('/rooms');

    // Click first room (if available)
    const firstRoom = page.locator('a[href*="/room-details"]').first();
    if (await firstRoom.isVisible()) {
      await firstRoom.click();

      // Check room details page
      await expect(page).toHaveURL(/room-details/);
      await expect(page.getByRole('heading', { name: /Yêu cầu xem phòng|Đặt lịch xem/ })).toBeVisible();
    }
  });
});
