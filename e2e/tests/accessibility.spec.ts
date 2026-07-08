import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicPaths = ['/homepage', '/rooms', '/contact', '/log-in'];
const themes = ['light', 'dark'] as const;
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const path of publicPaths) {
  for (const theme of themes) {
    for (const viewport of viewports) {
      test(`axe accessibility audit passes on ${path} ${theme} ${viewport.name}`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Run axe once in Chromium to keep CI fast.');

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript((selectedTheme) => localStorage.setItem('theme', selectedTheme), theme);
        await page.goto(path);

        const results = await new AxeBuilder({ page }).analyze();

        expect(results.violations).toEqual([]);
      });
    }
  }
}
