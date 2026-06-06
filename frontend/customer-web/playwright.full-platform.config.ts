import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'full-platform-user-journey.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 300_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../../artifacts/full-ui-e2e/playwright-report' }]],
  outputDir: '../../artifacts/full-ui-e2e/test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    viewport: { width: 1366, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
