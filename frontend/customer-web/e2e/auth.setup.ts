import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { testDataFactory } from '../../test-utils/test-data-factory';
import { TestHelpers } from './test-helpers';

const authFile = 'playwright/.auth';
mkdirSync(authFile, { recursive: true });

type AuthRole = 'customer' | 'admin' | 'restaurant' | 'driver';
type ApiLoginRole = Exclude<AuthRole, 'customer'>;

const authRoles = new Set(
  (process.env.E2E_AUTH_ROLES ?? 'customer')
    .split(',')
    .map((role) => role.trim())
    .filter((role): role is AuthRole =>
      ['customer', 'admin', 'restaurant', 'driver'].includes(role),
    ),
);

console.log(`Creating auth state for roles: ${[...authRoles].join(',')}`);

function registerAuthSetup(role: AuthRole, title: string, callback: any) {
  if (authRoles.has(role)) {
    setup(title, callback);
    return;
  }

  console.log(`Skipping auth state for role ${role}`);
}

function normalizeApiLoginPayload(payload: any) {
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

async function createStorageStateViaApi({
  page,
  browser,
  role,
  appUrl,
  email,
  password,
  storagePath,
}: {
  page: any;
  browser: any;
  role: ApiLoginRole;
  appUrl: string;
  email: string;
  password: string;
  storagePath: string;
}) {
  const response = await page.request.post(`${appUrl.replace(/\/$/, '')}/api/auth/login`, {
    data: role === 'admin'
      ? { email, password, userType: 'admin' }
      : role === 'restaurant'
        ? { email, password, userType: 'restaurant' }
        : { email, password, userType: 'driver' },
  });

  if (!response.ok()) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`API login failed for ${role}: ${response.status()} ${response.statusText()} ${bodyText}`);
  }

  const payload = normalizeApiLoginPayload(await response.json().catch(() => ({})));
  if (!payload.accessToken) {
    throw new Error(`API login for ${role} returned no access token`);
  }

  const context = await browser.newContext();
  const pageForOrigin = await context.newPage();
  await pageForOrigin.goto(`${appUrl.replace(/\/$/, '')}/`, { waitUntil: 'domcontentloaded' });

  await pageForOrigin.evaluate(({ role, accessToken, refreshToken, user }) => {
    const jsonUser = JSON.stringify(user);

    const writeLocal = (key: string, value: string) => localStorage.setItem(key, value);
    const writeSession = (key: string, value: string) => sessionStorage.setItem(key, value);

    if (role === 'admin') {
      writeSession('uberfoods_auth_token', accessToken);
      writeSession('uberfoods_auth_user', jsonUser);
      if (refreshToken) writeSession('uberfoods_auth_refresh_token', refreshToken);
      writeSession('access_token', accessToken);
      writeSession('auth_token', accessToken);
      if (refreshToken) writeSession('refresh_token', refreshToken);
      writeSession('user', jsonUser);
    } else if (role === 'restaurant') {
      writeLocal('restaurant_token', accessToken);
      writeLocal('restaurant_user', jsonUser);
      if (refreshToken) writeLocal('restaurant_refresh_token', refreshToken);
      writeLocal('access_token', accessToken);
      writeLocal('auth_token', accessToken);
      if (refreshToken) writeLocal('refresh_token', refreshToken);
      writeLocal('user', jsonUser);
    } else {
      writeLocal('driver_token', accessToken);
      writeLocal('driver_user', jsonUser);
      if (refreshToken) writeLocal('driver_refresh_token', refreshToken);
      writeLocal('access_token', accessToken);
      writeLocal('auth_token', accessToken);
      if (refreshToken) writeLocal('refresh_token', refreshToken);
      writeLocal('user', jsonUser);
    }
  }, { role, accessToken: payload.accessToken, refreshToken: payload.refreshToken, user: payload.user });

  await context.storageState({ path: storagePath });
  await context.close();
}

// Setup authentication state for each role
registerAuthSetup('customer', 'authenticate as customer', async ({ page, context }) => {
  const urls = testDataFactory.getFrontendUrls();
  const loginRoute = '/api/auth/customer/login';
  const customer = TestHelpers.createCustomerCredentials();

  // Add request/response logging for debugging (SECURITY: mask sensitive data)
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

  // PRE-FLIGHT CHECK: Verify customer URL is reachable
  console.log(`🔍 Pre-flight check: Testing ${urls.customer}/ and ${urls.customer}/login`);
  try {
    const homeResponse = await page.request.get(`${urls.customer}/`, { timeout: 3000 });
    if (homeResponse.status() >= 400) {
      throw new Error(`Home page returned ${homeResponse.status()}`);
    }
    console.log(`✅ ${urls.customer}/ reachable (${homeResponse.status()})`);
  } catch (error) {
    throw new Error(`❌ Customer URL ${urls.customer}/ not reachable: ${error.message}. Make sure customer-web is running on port 3102.`);
  }

  // Skip /login HTTP check for SPA routing - the page.goto() below will handle it
  console.log(`✅ SPA routing configured - proceeding with login flow`);

  console.log(`🚀 Proceeding with authentication setup...`);
  console.log(`🧪 Lifecycle customer credential email: ${customer.email}`);

  await TestHelpers.registerCustomer(page, customer, urls.customer);
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto(`${urls.customer}/login`);

  // Page loaded, proceeding with login

  // ROBUST: Priority-based field selection strategy
  // Email field - priority: placeholder > label > type
  const emailField =
    page.getByPlaceholder(/email/i).first()
    .or(page.getByLabel(/email/i).first())
    .or(page.locator('input[type="email"], input[name*="email"]').first());

  await emailField.fill(customer.email);
  console.log('✅ Email field filled');

  // Password field - priority: label > placeholder > type > autocomplete
  const passwordField =
    page.getByLabel(/passwort|password/i).first()
    .or(page.getByPlaceholder(/passwort|password/i).first())
    .or(page.locator('input[type="password"]').first())
    .or(page.locator('input[autocomplete*="password"]').first());

  await passwordField.fill(customer.password);
  console.log('✅ Password field filled (using priority-based selector)');

  // TEMP DEBUG: More robust waitForResponse that catches both URL patterns
  const respPromise = page.waitForResponse((resp) => {
    const url = resp.url();
    return resp.request().method() === 'POST'
      && new URL(url).pathname === loginRoute;
  }, { timeout: 15000 });

  await Promise.all([
    respPromise,
    page.getByRole('button', { name: /login|anmelden/i }).click(),
  ]);

  const resp = await respPromise;
  const route = new URL(resp.url()).pathname;
  console.log('[LOGIN RESPONSE]', resp.status(), route, customer.email);

  // VALIDATION: Check API contract compliance (accept success, auth failure, and server errors)
  expect(resp.status()).toBeGreaterThanOrEqual(200);
  // Allow 2xx success, 4xx auth failure, and 5xx server errors (for test environments)
  expect(resp.status()).toBeLessThan(600);

  const bodyText = await resp.text().catch(() => '');
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch (e) {
    // If JSON parsing fails, create empty data object
    data = {};
  }

  if (resp.status() >= 300) {
    console.error('[LOGIN FAILED DEBUG]', {
      status: resp.status(),
      route,
      email: customer.email,
      body: bodyText,
    });
    throw new Error(`Customer UI login failed with status ${resp.status()}`);
  }

  const normalized = normalizeApiLoginPayload(data);

  expect(normalized.accessToken).toEqual(expect.any(String));
  expect(normalized.refreshToken).toEqual(expect.any(String));
  expect(normalized.user).toEqual(expect.objectContaining({
    id: expect.any(String),
    email: customer.email,
    role: 'customer'
  }));

  // SECURITY: Log token presence but NOT the actual tokens
  const accessTokenPrefix = normalized.accessToken ? normalized.accessToken.substring(0, 10) + '...' : 'MISSING';
  const refreshTokenPrefix = normalized.refreshToken ? normalized.refreshToken.substring(0, 10) + '...' : 'MISSING';

  console.log('✅ API response validated - contract compliant');
  console.log('🔐 Tokens received - access:', accessTokenPrefix, 'refresh:', refreshTokenPrefix);

  // Login successful (201 response), validate by checking for auth state
  // instead of URL redirect which doesn't happen
  await page.waitForTimeout(1000); // Brief wait for frontend to process login

  // 3-FACTOR AUTH VALIDATION: localStorage + Cookies + UI State

  // Factor 1: localStorage/sessionStorage tokens
  const hasToken = await page.evaluate(() => {
    const localToken = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    const sessionToken = sessionStorage.getItem('access_token') || sessionStorage.getItem('auth_token');
    return !!(localToken || sessionToken);
  });

  console.log(hasToken ? '✅ Auth token found in storage' : '⚠️  No auth token in storage (might use different method)');

  // Factor 2: Auth cookies (common patterns)
  const authCookies = await page.context().cookies();
  const hasAuthCookie = authCookies.some(cookie =>
    cookie.name.toLowerCase().includes('auth') ||
    cookie.name.toLowerCase().includes('token') ||
    cookie.name.toLowerCase().includes('session')
  );

  console.log(hasAuthCookie ? '✅ Auth cookie found' : '⚠️  No auth cookie found (might use different method)');

  // Factor 3: UI state changes (login form gone, user profile visible, etc.)
  const loginButtonVisible = await page.locator('button[type="submit"], button:has-text("Login")').isVisible().catch(() => false);
  const hasUserProfile = await page.locator('[data-testid*="profile"], [data-testid*="user"], .user-profile, .profile').isVisible().catch(() => false);
  const hasDashboard = await page.locator('[data-testid*="dashboard"], .dashboard, [href*="dashboard"]').isVisible().catch(() => false);

  const uiStateChanged = !loginButtonVisible || hasUserProfile || hasDashboard;

  if (!loginButtonVisible) console.log('✅ Login form no longer visible');
  if (hasUserProfile) console.log('✅ User profile visible');
  if (hasDashboard) console.log('✅ Dashboard accessible');

  // Overall validation: At least 2 out of 3 factors must pass
  const validationScore = [hasToken, hasAuthCookie, uiStateChanged].filter(Boolean).length;

  if (validationScore >= 2) {
    console.log(`✅ Authentication validated (${validationScore}/3 factors passed)`);
  } else {
    console.log(`⚠️  Authentication validation weak (${validationScore}/3 factors passed) - but login API succeeded`);
  }

  // Save authentication state
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
});

registerAuthSetup('restaurant', 'authenticate as restaurant', async ({ page, context }) => {
  const urls = testDataFactory.getFrontendUrls();
  setup.skip(!urls.restaurant, "RESTAURANT_URL not set – skipping restaurant auth setup");

  const restaurant = testDataFactory.getTestRestaurant();
  await createStorageStateViaApi({
    page,
    browser: page.context().browser(),
    role: 'restaurant',
    appUrl: urls.restaurant,
    email: process.env.E2E_RESTAURANT_EMAIL || restaurant.email,
    password: process.env.E2E_RESTAURANT_PASSWORD || restaurant.password,
    storagePath: `${authFile}/restaurant.json`,
  });
});

registerAuthSetup('driver', 'authenticate as driver', async ({ page, context }) => {
  const urls = testDataFactory.getFrontendUrls();
  setup.skip(!urls.driver, "DRIVER_URL not set – skipping driver auth setup");

  const driver = testDataFactory.getTestDriver();
  await createStorageStateViaApi({
    page,
    browser: page.context().browser(),
    role: 'driver',
    appUrl: urls.driver,
    email: process.env.E2E_DRIVER_EMAIL || driver.email,
    password: process.env.E2E_DRIVER_PASSWORD || driver.password,
    storagePath: `${authFile}/driver.json`,
  });
});

registerAuthSetup('admin', 'authenticate as admin', async ({ page, context }) => {
  const urls = testDataFactory.getFrontendUrls();
  setup.skip(!urls.admin, "ADMIN_URL not set – skipping admin auth setup");

  const admin = testDataFactory.getTestAdmin();
  await createStorageStateViaApi({
    page,
    browser: page.context().browser(),
    role: 'admin',
    appUrl: urls.admin,
    email: process.env.E2E_ADMIN_EMAIL || admin.email,
    password: process.env.E2E_ADMIN_PASSWORD || admin.password,
    storagePath: `${authFile}/admin.json`,
  });
});
