import { defineConfig, devices } from '@playwright/test';

const useSystemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === '1';
const chromeDevice = {
  ...devices['Desktop Chrome'],
  ...(useSystemChrome ? { channel: 'chrome' as const } : {}),
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // STRICT: Sequential for deterministic results
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // 1 retry in CI for flakes, 0 locally for strictness
  workers: 1, // STRICT: Single worker for deterministic, debuggable results
  reporter: [['html'], ['json'], ['junit']],
  outputDir: `test-results/${process.env.RUN_ID || 'local'}`,
  use: {
    baseURL: process.env.CUSTOMER_URL || process.env.BASE_URL || "http://127.0.0.1:3102",
    trace: 'retain-on-failure', // Changed for better debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure', // Changed for better debugging
    storageState: undefined, // Will be set per test
  },

  // E2E Test environment variables
  define: {
    'process.env.VITE_E2E_DISABLE_UI_PREFS': 'true', // Disable UI preferences API calls in E2E
  },

  projects: [
    // Authentication setup (runs once per role)
    {
      name: 'setup',
      testMatch: 'auth.setup.ts',
      use: { ...chromeDevice },
    },

    // Main test suite with authenticated sessions
    {
      name: 'chromium',
      use: {
        ...chromeDevice,
        storageState: 'playwright/.auth/customer.json'
      },
      dependencies: ['setup'],
    },

    // Additional authenticated projects for different roles
    {
      name: 'customer-auth',
      testDir: './e2e',
      testMatch: '**/*.customer.spec.ts',
      use: {
        ...chromeDevice,
        // storageState: 'playwright/.auth/customer.json' // Disabled for E2E fix
      },
      // dependencies: ['setup'], // Disabled for E2E fix
    },

    {
      name: 'restaurant-auth',
      testDir: './e2e',
      testMatch: '**/*.restaurant.spec.ts',
      use: {
        ...chromeDevice,
        storageState: 'playwright/.auth/restaurant.json'
      },
      dependencies: ['setup'],
    },

    {
      name: 'driver-auth',
      testDir: './e2e',
      testMatch: '**/*.driver.spec.ts',
      use: {
        ...chromeDevice,
        storageState: 'playwright/.auth/driver.json'
      },
      dependencies: ['setup'],
    },

    {
      name: 'admin-auth',
      testDir: './e2e',
      testMatch: '**/*.admin.spec.ts',
      use: {
        ...chromeDevice,
        storageState: 'playwright/.auth/admin.json'
      },
      dependencies: ['setup'],
    },

    // Full lifecycle test (uses setup but manages its own auth)
    {
      name: 'full-lifecycle',
      testDir: './e2e',
      testMatch: 'full-order-lifecycle.spec.ts',
      use: { ...chromeDevice },
      dependencies: ['setup'], // Still depends on setup to ensure auth states exist
    },

    // Reduced browser matrix for faster E2E cycles (only for critical tests)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
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
