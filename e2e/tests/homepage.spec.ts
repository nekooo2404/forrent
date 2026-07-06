import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/homepage');

    // Check page title
    await expect(page).toHaveTitle(/ForRent/);

    // Check hero section
    await expect(page.getByRole('heading', { name: /Chọn phòng đang trống/ })).toBeVisible();

    // Check navigation
    await expect(page.getByRole('link', { name: 'Trang chủ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Danh sách phòng' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Liên hệ' })).toBeVisible();
  });

  test('should navigate to rooms page', async ({ page }) => {
    await page.goto('/homepage');
    await page.getByRole('link', { name: 'Danh sách phòng' }).click();

    await expect(page).toHaveURL(/\/rooms/);
    await expect(page.getByRole('heading', { name: /Bộ lọc/ })).toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should open mobile menu', async ({ page }) => {
    await page.goto('/homepage');

    // Click hamburger button
    await page.getByRole('button', { name: 'Menu' }).click();

    // Check menu items visible
    await expect(page.getByRole('link', { name: 'Trang chủ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Danh sách phòng' })).toBeVisible();

    // Close menu
    await page.getByRole('button', { name: 'Đóng menu' }).click();
  });
});
