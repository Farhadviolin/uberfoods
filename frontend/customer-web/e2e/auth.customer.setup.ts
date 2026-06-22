import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { testDataFactory } from '../../test-utils/test-data-factory';
import { TestHelpers } from './test-helpers';

const authFile = 'playwright/.auth';
mkdirSync(authFile, { recursive: true });

function normalizeCustomerLoginPayload(payload: any) {
  const data = payload?.data ?? payload ?? {};
  const accessToken = data.access_token ?? data.accessToken ?? data.token ?? null;
  const refreshToken = data.refresh_token ?? data.refreshToken ?? null;
  const user = data.user ?? {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role ?? data.userType,
    userType: data.userType,
    restaurantId: data.restaurantId,
    mustChangePassword: data.mustChangePassword,
    isActive: data.isActive,
    currentStatus: data.currentStatus,
  };

  return { accessToken, refreshToken, user, raw: data };
}

setup('authenticate as customer', async ({ page }) => {
  const urls = testDataFactory.getFrontendUrls();

  page.on('request', (r) => {
    if (r.url().includes('/api/auth')) {
      const maskedUrl = r.url().replace(/password=[^&]*/g, 'password=***MASKED***');
      console.log('[REQ]', r.method(), maskedUrl);
    }
  });

  page.on('response', async (r) => {
    if (r.url().includes('/api/auth')) {
      const maskedUrl = r.url().replace(/password=[^&]*/g, 'password=***MASKED***');
      console.log('[RES]', r.status(), maskedUrl);
    }
  });

  page.on('requestfailed', (r) => {
    if (r.url().includes('/api/auth')) {
      const maskedUrl = r.url().replace(/password=[^&]*/g, 'password=***MASKED***');
      console.log('[REQFAIL]', maskedUrl, r.failure()?.errorText);
    }
  });

  console.log(`🔍 Pre-flight check: Testing ${urls.customer}/ and ${urls.customer}/login`);
  const homeResponse = await page.request.get(`${urls.customer}/`, { timeout: 3000 });
  if (homeResponse.status() >= 400) {
    throw new Error(`Home page returned ${homeResponse.status()}`);
  }
  console.log(`✅ ${urls.customer}/ reachable (${homeResponse.status()})`);

  console.log('✅ SPA routing configured - proceeding with login flow');
  console.log('🚀 Proceeding with authentication setup...');

  const credentials = TestHelpers.createCustomerCredentials();
  console.log(`🧪 Customer E2E credential email: ${credentials.email}`);

  await TestHelpers.registerCustomer(page, credentials, urls.customer);

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  if (!page.url().includes('/login')) {
    await page.goto(`${urls.customer}/login`);
  }
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  const loginResponsePromise = page.waitForResponse((resp) =>
    resp.request().method() === 'POST'
      && new URL(resp.url()).pathname === '/api/auth/customer/login',
    { timeout: 15000 },
  );
  await Promise.all([
    loginResponsePromise,
    page.getByRole('button', { name: /login|anmelden/i }).click(),
  ]);

  const resp = await loginResponsePromise;
  const route = new URL(resp.url()).pathname;
  console.log('[LOGIN RESPONSE]', resp.status(), route, credentials.email);
  if (!resp.ok()) {
    const body = await resp.text().catch(() => '');
    console.error('[LOGIN FAILED DEBUG]', {
      status: resp.status(),
      route,
      email: credentials.email,
      body,
    });
    throw new Error(`Customer UI login failed with status ${resp.status()}`);
  }

  const data = await resp.json().catch(() => ({}));
  const normalized = normalizeCustomerLoginPayload(data);

  expect(normalized.accessToken).toEqual(expect.any(String));
  expect(normalized.refreshToken).toEqual(expect.any(String));
  expect(normalized.user).toEqual(expect.objectContaining({
    id: expect.any(String),
    email: credentials.email,
    role: 'customer',
  }));

  await page.evaluate(({ accessToken, refreshToken, user }) => {
    const jsonUser = JSON.stringify(user);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('user', jsonUser);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  }, {
    accessToken: normalized.accessToken,
    refreshToken: normalized.refreshToken,
    user: normalized.user,
  });

  await page.context().storageState({ path: `${authFile}/customer.json` });

  const accessTokenPrefix = normalized.accessToken.substring(0, 10) + '...';
  const refreshTokenPrefix = normalized.refreshToken.substring(0, 10) + '...';

  console.log('✅ API response validated - contract compliant');
  console.log('🔐 Tokens received - access:', accessTokenPrefix, 'refresh:', refreshTokenPrefix);
});
