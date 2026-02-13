import { defineConfig, devices } from '@playwright/test';

const ORCH = process.env.E2E_ORCHESTRATED === '1';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: ORCH
    ? undefined
    : [
        {
          command: 'powershell -ExecutionPolicy Bypass -File ./setup-e2e.ps1',
          url: 'http://127.0.0.1:3000/api/health',
          timeout: 300_000, // 5 minutes for full setup
          reuseExistingServer: !process.env.CI,
        },
        {
          command: 'npm run dev:e2e',
          url: 'http://127.0.0.1:3002',
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
      ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});