import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    ...devices['Desktop Chrome'],
    ...(process.env['CI'] ? {} : { channel: 'chrome' }),
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:4200',
  },
});
