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

    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'] ?? '';

    expect(response.ok()).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("style-src-attr 'unsafe-hashes'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain('supabase');
    expect(csp).not.toContain('googleusercontent');
  });

  test('uses the site root as the canonical homepage', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run SEO regression once.');

    const legacy = await request.get('/homepage', { maxRedirects: 0 });
    expect(legacy.status()).toBe(308);
    expect(legacy.headers().location).toBe('/');

    const root = await request.get('/');
    expect(root.ok()).toBeTruthy();
    const canonical = (await root.text()).match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
    expect(canonical).not.toBe('');
    expect(new URL(canonical).pathname).toBe('/');
  });

  test('caches public pages without caching session endpoints', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run cache regression once.');

    for (const path of ['/', '/rooms', '/blogs', '/contact']) {
      const response = await request.get(path);
      const cacheControl = response.headers()['cache-control'] ?? '';

      expect(response.ok()).toBeTruthy();
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age=30');
      expect(cacheControl).toContain('s-maxage=60');
    }

    for (const path of ['/api/auth/session', '/log-in']) {
      const response = await request.get(path);
      expect(response.headers()['cache-control'] ?? '').not.toContain('public');
    }
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
    const homepageEntry = xml.match(/<url>\s*<loc>https?:\/\/[^<]+\/<\/loc>([\s\S]*?)<\/url>/)?.[1] ?? '';

    expect(response.ok()).toBeTruthy();
    expect(xml).not.toContain('/room-details');
    expect(xml).not.toContain('/homepage');
    expect(homepageEntry).not.toContain('<lastmod>');
  });

  test('room pages expose valid structured data', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run SEO regression once.');

    await page.goto('/rooms');
    const listData = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
    expect(listData['@type']).toBe('ItemList');
    expect(listData.itemListElement[0]).toMatchObject({ '@type': 'ListItem', name: 'Can ho dich vu Nam Tu Liem' });

    await page.goto('/rooms/ph%C3%B2ng-%C4%91%E1%BA%B9p-h%C3%A0-n%E1%BB%99i');
    const detailData = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
    expect(detailData['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'Offer' }),
      expect.objectContaining({ '@type': 'BreadcrumbList' }),
    ]));
  });

  test('strict CSP does not block client or admin UI styles', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Run CSP browser regression once.');
    const violations: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) violations.push(message.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.site-menu-button').click();
    await expect(page.locator('.site-mobile-menu')).toBeVisible();
    await page.goto('/rooms');
    await page.goto(new URL('/log-in', adminBaseURL).toString());

    expect(violations).toEqual([]);
  });
});
