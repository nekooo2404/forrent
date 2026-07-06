import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
  test('should display contact form', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.getByRole('heading', { name: /Liên hệ/ })).toBeVisible();
    await expect(page.getByLabel(/Họ và tên/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Số điện thoại/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Gửi/i })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/contact');

    // Try to submit without filling fields
    await page.getByRole('button', { name: /Gửi/i }).click();

    // Browser validation should trigger
    const nameInput = page.getByLabel(/Họ và tên/i);
    await expect(nameInput).toBeFocused();
  });

  test('should validate phone format', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel(/Họ và tên/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel(/Số điện thoại/i).fill('123'); // Invalid phone
    await page.getByRole('button', { name: /Gửi/i }).click();

    // Should show validation error
    const phoneInput = page.getByLabel(/Số điện thoại/i);
    await expect(phoneInput).toHaveAttribute('pattern');
  });
});
