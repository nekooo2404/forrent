import { defineConfig, devices } from '@playwright/test';

const adminBaseURL = process.env.ADMIN_BASE_URL || 'http://localhost:3001';
const mockApiURL = 'http://127.0.0.1:4100';
const internalMockApiURL = 'http://127.0.0.1:4101';
process.env.ADMIN_BASE_URL = adminBaseURL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{platform}/{arg}{ext}',
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
      command: 'node mock-api.mjs',
      env: {
        MOCK_API_PORT: '4101',
        ROOM_DETAIL_DELAY_MS: '1200',
      },
      url: `${internalMockApiURL}/api/health/`,
      reuseExistingServer: false,
      timeout: 10000,
    },
    {
      command: 'cd ../frontend-client && node -e "require(\'node:fs\').rmSync(\'.next\',{recursive:true,force:true})" && npm run build && node -e "const fs=require(\'node:fs\');fs.cpSync(\'.next/static\',\'.next/standalone/.next/static\',{recursive:true});if(fs.existsSync(\'public\'))fs.cpSync(\'public\',\'.next/standalone/public\',{recursive:true})" && node .next/standalone/server.js',
      env: {
        API_BASE_URL: internalMockApiURL,
        HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_API_BASE_URL: mockApiURL,
        PORT: '3000',
      },
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 300000,
    },
    {
      command: 'cd ../frontend-admin && node -e "require(\'node:fs\').rmSync(\'.next\',{recursive:true,force:true})" && npm run build && node -e "const fs=require(\'node:fs\');fs.cpSync(\'.next/static\',\'.next/standalone/.next/static\',{recursive:true});if(fs.existsSync(\'public\'))fs.cpSync(\'public\',\'.next/standalone/public\',{recursive:true})" && node .next/standalone/server.js',
      env: {
        API_BASE_URL: internalMockApiURL,
        HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_API_BASE_URL: mockApiURL,
        NEXT_PUBLIC_CLIENT_URL: 'http://localhost:3000',
        PORT: '3001',
      },
      url: adminBaseURL,
      reuseExistingServer: false,
      timeout: 300000,
    },
  ],
});
