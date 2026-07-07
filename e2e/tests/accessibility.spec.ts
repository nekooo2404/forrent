import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/homepage', '/rooms', '/contact', '/log-in']) {
  test(`axe accessibility audit passes on ${path}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Run axe once in Chromium to keep CI fast.');

    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto(path);

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
}
