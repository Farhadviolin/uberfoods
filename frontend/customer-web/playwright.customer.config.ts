import { defineConfig, devices } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html'], ['json'], ['junit']],
  outputDir: `test-results/${process.env.RUN_ID || 'local'}`,
  use: {
    baseURL: process.env.CUSTOMER_URL || process.env.BASE_URL || 'http://127.0.0.1:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: undefined,
  },
  define: {
    'process.env.VITE_E2E_DISABLE_UI_PREFS': 'true',
  },
  projects: [
    {
      name: 'setup',
      testMatch: 'auth.customer.setup.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath
          ? { executablePath: chromiumExecutablePath }
          : undefined,
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath
          ? { executablePath: chromiumExecutablePath }
          : undefined,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.RELEASE_GATE_MANAGED
    ? undefined
    : {
        command: 'pnpm dev --host 127.0.0.1 --port 3002',
        port: 3002,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
