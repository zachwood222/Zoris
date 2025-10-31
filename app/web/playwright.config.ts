import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true
  },
  webServer: {
    command: 'npm run dev',
    cwd: __dirname,
    env: {
      ...process.env,
      SKIP_API_PROXY: process.env.SKIP_API_PROXY ?? '1'
    },
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI
  }
});
