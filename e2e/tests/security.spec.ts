import { expect, test } from '@playwright/test';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';

test.describe('Security headers and origin guard', () => {
  test('rejects cross-origin API mutations', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run API security regression once.');

    const response = await request.post('/api/auth/refresh', {
      data: {},
      headers: { Origin: 'https://evil.example' },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      message: 'Invalid request origin.',
      errors: {},
    });
  });

  test('serves strict CSP without unsafe-inline', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run header security regression once.');

    const response = await request.get('/homepage');
    const csp = response.headers()['content-security-policy'] ?? '';

    expect(response.ok()).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("style-src-attr 'unsafe-hashes'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain('supabase');
    expect(csp).not.toContain('googleusercontent');
  });

  test('refresh without a session is a no-op', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run API security regression once.');

    const response = await request.post('/api/auth/refresh', {
      headers: { Origin: 'http://localhost:3000' },
    });

    expect(response.status()).toBe(204);
  });

  test('anonymous session check succeeds without refreshing', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run API security regression once.');

    const response = await request.get('/api/auth/session');

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { authenticated: false },
    });
  });

  test('sitemap uses clean room URLs and stable static metadata', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run SEO regression once.');

    const response = await request.get('/sitemap.xml');
    const xml = await response.text();
    const homepageEntry = xml.match(/<url>\s*<loc>[^<]*\/homepage<\/loc>([\s\S]*?)<\/url>/)?.[1] ?? '';

    expect(response.ok()).toBeTruthy();
    expect(xml).not.toContain('/room-details');
    expect(homepageEntry).not.toContain('<lastmod>');
  });

  test('strict CSP does not block client or admin UI styles', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run CSP browser regression once.');
    const violations: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) violations.push(message.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/homepage');
    await page.locator('.site-menu-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeVisible();
    await page.goto('/rooms');
    await page.goto(new URL('/log-in', adminBaseURL).toString());

    expect(violations).toEqual([]);
  });
});
