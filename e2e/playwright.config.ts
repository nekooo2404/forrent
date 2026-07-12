import { defineConfig, devices } from '@playwright/test';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';
const mockApiURL = 'http://127.0.0.1:4100';
process.env.ADMIN_BASE_URL = adminBaseURL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
  use: {
    baseURL: 'http://localhost:3000',
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: [
    {
      command: 'node mock-api.mjs',
      url: `${mockApiURL}/api/health/`,
      reuseExistingServer: false,
      timeout: 10000,
    },
    {
      command: 'cd ../frontend-client && node -e "require(\'node:fs\').rmSync(\'.next\',{recursive:true,force:true})" && npm run build && npm run start',
      env: {
        API_BASE_URL: mockApiURL,
        NEXT_PUBLIC_API_BASE_URL: mockApiURL,
      },
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: 'cd ../frontend-admin && node -e "require(\'node:fs\').rmSync(\'.next\',{recursive:true,force:true})" && npm run build && npm run start',
      url: adminBaseURL,
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
});
