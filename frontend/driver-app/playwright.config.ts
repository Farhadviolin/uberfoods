import { defineConfig, devices } from '@playwright/test';

// Mock TransformStream for Node.js environment
if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = class TransformStream {
    constructor() {
      return {};
    }
  };
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4175',
    trace: 'retain-on-failure',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_ORCHESTRATED ? undefined : {
    command: 'npm run dev -- --host 0.0.0.0 --port 4175',
    url: 'http://localhost:4175',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SKIP_AUTH: 'false',
    },
  },
});
