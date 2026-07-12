import { expect, test } from '@playwright/test';

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
    expect(csp).not.toContain("'unsafe-inline'");
  });
});
