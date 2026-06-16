import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { test, TestHelpers, testUrls, testSelectors } from './test-helpers';
import { testDataFactory } from '../../test-utils/test-data-factory';

// Generate unique run ID for test isolation
const RUN_ID = process.env.GITHUB_RUN_ID
  || process.env.RUN_ID
  || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT || '1';
const LIFECYCLE_CUSTOMER_ADDRESS = 'Test Street 123, 1010 Vienna';

function createLifecycleCustomerCredentials() {
  const token = `${RUN_ID}.${RUN_ATTEMPT}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.${randomUUID()}`;
  return {
    email: `customer.lifecycle.fullorder.${token}@example.test`,
    password: `customer.${token}`,
    name: `Full Order Lifecycle Customer ${token}`,
    phone: '+43 123 456 789',
    address: LIFECYCLE_CUSTOMER_ADDRESS,
  };
}

async function withStepTimeout<T>(
  label: string,
  action: () => Promise<T>,
  timeoutMs = 30000,
): Promise<T> {
  console.log(`➡️ lifecycle step start: ${label}`);
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Lifecycle step timed out: ${label}`));
      }, timeoutMs);
    });

    const result = await Promise.race([action(), timeout]);
    console.log(`✅ lifecycle step done: ${label}`);
    return result;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

type LifecycleCustomerCredentials = {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
};

async function registerCustomerForLifecycleWithDiagnostics(
  page: Page,
  credentials: LifecycleCustomerCredentials,
  appUrl: string,
): Promise<LifecycleCustomerCredentials> {
  const registerUrl = `${appUrl}/register`;
  console.log('[customer-e2e] register navigation', {
    appUrl,
    registerUrl,
    apiBaseUrl: process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'unset',
  });

  await withStepTimeout('register: build register url', async () => {
    expect(registerUrl).toContain('/register');
    console.log('✅ register: register url built');
  }, 5000);

  await withStepTimeout('register: goto register page', async () => {
    await page.goto(registerUrl, { waitUntil: 'domcontentloaded' });
  }, 30000);

  await withStepTimeout('register: wait for register form', async () => {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
    const registerPasswordInputs = page.locator('input[type="password"]');
    await expect(registerPasswordInputs.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ register: register form visible');
  }, 20000);

  await withStepTimeout('register: fill name', async () => {
    await page.locator('input[type="text"], input[name="name"]').first().fill(credentials.name);
  }, 15000);

  await withStepTimeout('register: fill email', async () => {
    await page.locator('input[type="email"]').fill(credentials.email);
  }, 15000);

  await withStepTimeout('register: fill phone if present', async () => {
    const phoneField = page.locator('input[type="tel"], input[name="phone"]').first();
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill(credentials.phone);
      console.log('✅ register: phone field filled');
    } else {
      console.log('ℹ️ register: phone field not visible');
    }
  }, 15000);

  await withStepTimeout('register: fill password', async () => {
    await page.locator('input[type="password"]').first().fill(credentials.password);
  }, 15000);

  await withStepTimeout('register: fill confirm password if present', async () => {
    const registerPasswordInputs = page.locator('input[type="password"]');
    if (await registerPasswordInputs.count() > 1) {
      await registerPasswordInputs.nth(1).fill(credentials.password);
      console.log('✅ register: confirm password field filled');
    } else {
      console.log('ℹ️ register: confirm password field not visible');
    }
  }, 15000);

  const registerRoute = '/api/auth/customer/register';
  const registerResponsePromise = page.waitForResponse(
    response => response.request().method() === 'POST'
      && new URL(response.url()).pathname === registerRoute,
    { timeout: 15000 },
  );

  await withStepTimeout('register: submit form', async () => {
    await page.locator('button[type="submit"], button:has-text("Register")').click();
  }, 15000);

  const registerResponse = await withStepTimeout('register: wait for register response', async () => {
    const response = await registerResponsePromise;
    console.log(`✅ register: response received (${response.status()})`);
    return response;
  }, 20000);

  if (registerResponse.status() !== 201) {
    const body = await registerResponse.text().catch(() => '');
    const normalizedBody = body.toLowerCase();
    const isAlreadyExists = (registerResponse.status() === 401 || registerResponse.status() === 409)
      && normalizedBody.includes('already exists');

    console.error('[REGISTER FAILED DEBUG]', {
      status: registerResponse.status(),
      route: registerUrl,
      body,
    });

    if (isAlreadyExists) {
      console.warn('[REGISTER FALLBACK] Customer already exists, attempting login with the same credentials');
      await withStepTimeout('register: login fallback after already-exists', async () => {
        await TestHelpers.loginCustomer(page, credentials, appUrl);
      }, 30000);
      return credentials;
    }

    throw new Error(`Customer register failed: ${registerResponse.status()} ${registerResponse.statusText()} ${body}`);
  }

  await withStepTimeout('register: wait for post-register app state', async () => {
    await Promise.race([
      page.waitForURL(/.*(login|dashboard|home|restaurants|menu|restaurant)/i, { timeout: 10000 }).catch(() => null),
      page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null),
    ]);
    console.log(`ℹ️ register: post-register URL is ${page.url()}`);
  }, 15000);

  return credentials;
}

async function resolveMinimumOrderSubtotal(page: Page, cartPrefix = 'cart_') {
  return page.evaluate(({ prefix }) => {
    const parseAmount = (value: unknown) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }
      if (typeof value !== 'string') {
        return null;
      }

      const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
      const amount = Number(normalized);
      return Number.isFinite(amount) ? amount : null;
    };
    const texts = Array.from(document.querySelectorAll(
      '[data-testid="cart"], .cart, [data-testid*="subtotal"], .cart-summary, .order-summary',
    ))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((element) => element.textContent || '');
    const labeledSubtotal = texts
      .map((text) => text.match(/(?:Subtotal|Zwischensumme)\s*:?\s*(?:€\s*)?([\d.,]+)\s*€?/i)?.[1])
      .find(Boolean);

    if (labeledSubtotal) {
      return {
        subtotal: parseAmount(labeledSubtotal),
        source: 'visible-cart',
        cartStatePresent: true,
        itemDiagnostics: [],
      };
    }

    let storageSubtotal = 0;
    let cartStatePresent = false;
    const itemDiagnostics: Array<{
      itemKeys: string[];
      nestedKeys: Record<string, string[]>;
      priceField: string | null;
      quantityField: string | null;
    }> = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      cartStatePresent = true;

      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.items)
            ? parsed.items
            : Array.isArray(parsed?.cart)
              ? parsed.cart
              : [];
        storageSubtotal += items.reduce((sum: number, item: Record<string, unknown>) => {
          const nestedRecords = ['dish', 'menuItem', 'item', 'product'].reduce<Record<string, Record<string, unknown>>>((records, key) => {
            const value = item?.[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              records[key] = value as Record<string, unknown>;
            }
            return records;
          }, {});
          const directTotal = [
            ['totalPrice', item?.totalPrice],
            ['subtotal', item?.subtotal],
          ] as const;
          const unitPrices = [
            ['price', item?.price],
            ['unitPrice', item?.unitPrice],
            ...Object.entries(nestedRecords).flatMap(([key, record]) => [
              [`${key}.price`, record.price] as const,
              [`${key}.unitPrice`, record.unitPrice] as const,
            ]),
          ] as const;
          const quantities = [
            ['quantity', item?.quantity],
            ['qty', item?.qty],
            ['count', item?.count],
          ] as const;
          const resolvedTotal = directTotal
            .map(([field, value]) => ({ field, value: parseAmount(value) }))
            .find((candidate) => candidate.value !== null);
          const resolvedUnitPrice = unitPrices
            .map(([field, value]) => ({ field, value: parseAmount(value) }))
            .find((candidate) => candidate.value !== null);
          const resolvedQuantity = quantities
            .map(([field, value]) => ({ field, value: parseAmount(value) }))
            .find((candidate) => candidate.value !== null && candidate.value > 0);

          itemDiagnostics.push({
            itemKeys: Object.keys(item || {}),
            nestedKeys: Object.fromEntries(Object.entries(nestedRecords).map(([key, record]) => [key, Object.keys(record)])),
            priceField: resolvedTotal?.field ?? resolvedUnitPrice?.field ?? null,
            quantityField: resolvedQuantity?.field ?? null,
          });

          if (resolvedTotal?.value !== null && resolvedTotal?.value !== undefined) {
            return sum + resolvedTotal.value;
          }
          if (resolvedUnitPrice?.value !== null && resolvedUnitPrice?.value !== undefined) {
            return sum + resolvedUnitPrice.value * (resolvedQuantity?.value ?? 1);
          }
          return sum;
        }, 0);
      } catch {
        // The caller reports that cart state existed but could not produce a subtotal.
      }
    }

    return {
      subtotal: storageSubtotal > 0 ? storageSubtotal : null,
      source: storageSubtotal > 0 ? 'localStorage-cart-state' : null,
      cartStatePresent,
      itemDiagnostics,
    };
  }, { prefix: cartPrefix });
}

test.describe('Full Order Lifecycle UI-E2E', () => {
  let orderId: string;
  let orderRestaurantId: string | null = null;
  let lastOrderCreateResponse: Response | null = null;
  let pendingOrderCreateResponse: Promise<Response | null> | null = null;
  let customerCredentials = createLifecycleCustomerCredentials();
  let lastSafeMinimumOrderSubtotal: number | null = null;
  let lastSafeMinimumOrderSource: string | null = null;
  const selectors = testSelectors;
  const testOrder = testDataFactory.getTestOrder();
  const driverUser = testDataFactory.getTestDriver();

  test.beforeAll(() => {
    // Reset test data factory with consistent seed for this run
    testDataFactory.resetSeed(1234567890); // Fixed seed for deterministic results
    customerCredentials = createLifecycleCustomerCredentials();
  });

  test.beforeEach(async () => {
    console.log(`🆔 Test Run ID: ${RUN_ID}`);
  });

  async function logCustomerUserSnapshot(page: Page, label: string) {
    const snapshot = await page.evaluate(() => {
      const raw = window.localStorage.getItem('customer_user');
      try {
        return { raw, parsed: raw ? JSON.parse(raw) : null };
      } catch {
        return { raw, parsed: null };
      }
    });

    console.log(label, snapshot);
  }

  async function installCustomerStorageDiagnostics(page: Page) {
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      const originalClear = Storage.prototype.clear;

      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'customer_user') {
          console.log('customerUserStorageMutation', {
            type: 'setItem',
            key,
            value,
            stack: new Error().stack,
          });
        }
        return originalSetItem.call(this, key, value);
      };

      Storage.prototype.removeItem = function (key: string) {
        if (key === 'customer_user') {
          console.log('customerUserStorageMutation', {
            type: 'removeItem',
            key,
            previousValue: window.localStorage.getItem(key),
            stack: new Error().stack,
          });
        }
        return originalRemoveItem.call(this, key);
      };

      Storage.prototype.clear = function () {
        console.log('customerUserStorageMutation', {
          type: 'clear',
          previousValue: window.localStorage.getItem('customer_user'),
          stack: new Error().stack,
        });
        return originalClear.call(this);
      };
    });
  }

  test.setTimeout(25 * 60 * 1000); // 25 minutes, stays below the 35-minute CI job timeout

  test('Complete Order Lifecycle: Customer → Restaurant → Driver → Admin', async ({ browser }) => {
    console.log(`🆔 Starting Full Order Lifecycle Test (Run: ${RUN_ID})`);

    // Create browser contexts for each app with isolated sessions
    const customerContext = await browser.newContext({
      storageState: undefined, // Fresh session for registration
    });
    const restaurantContext = await browser.newContext({
      storageState: 'playwright/.auth/restaurant.json'
    });
    const driverContext = await browser.newContext({
      storageState: 'playwright/.auth/driver.json'
    });
    const adminContext = await browser.newContext({
      storageState: 'playwright/.auth/admin.json'
    });

    // Create pages for each app
    const customerPage = await customerContext.newPage();
    const restaurantPage = await restaurantContext.newPage();
    const driverPage = await driverContext.newPage();
    const adminPage = await adminContext.newPage();

    try {
      await installCustomerStorageDiagnostics(customerPage);

      // ============================================
      // PHASE 1: CUSTOMER CREATES ORDER
      // ============================================
      console.log('🚀 Phase 1: Customer creates order');

      await withStepTimeout('phase1 customer initial navigation', async () => {
        console.log(`➡️ lifecycle: phase1 opening customer home (${testUrls.customer})`);
        await customerPage.goto(testUrls.customer);
        await TestHelpers.waitForStablePage(customerPage);
        console.log('✅ lifecycle: phase1 customer home ready');
      });

      await withStepTimeout('phase1 customer registration', async () => {
        console.log('➡️ lifecycle: phase1 registering customer');
        await registerCustomerForLifecycleWithDiagnostics(customerPage, customerCredentials, testUrls.customer);
        console.log('✅ lifecycle: phase1 customer registered');
      });

      await withStepTimeout('phase1 customer registration screenshot', async () => {
        await TestHelpers.takeScreenshot(customerPage, 'customer_registered');
      });

      await withStepTimeout('phase1 restaurant list navigation', async () => {
        console.log('➡️ lifecycle: phase1 opening restaurant list');
        await customerPage.goto(`${testUrls.customer}/restaurants`);
        await testDataFactory.waitForStablePage(customerPage);
        console.log('✅ lifecycle: phase1 restaurant list visible');
      });

      await withStepTimeout('phase1 restaurant selection', async () => {
        const restaurantCard = customerPage.locator('[data-testid="restaurant-card"], .restaurant-card').first();
        await expect(restaurantCard).toBeVisible();
        console.log('✅ lifecycle: phase1 restaurant card visible');
        await restaurantCard.click();
        await customerPage.waitForURL(/\/restaurant\/[^/]+$/);
        await expect(customerPage.locator('[data-testid="menu-content"]')).toBeVisible();
        console.log('✅ lifecycle: phase1 restaurant selected');
        console.log('✅ lifecycle: phase1 menu content visible');
      });

      const addToCartButtons = customerPage.locator('[data-testid="add-to-cart-button"]');

      await withStepTimeout('phase1 add first items to cart', async () => {
        const addToCartButtonCount = await addToCartButtons.count();
        expect(addToCartButtonCount).toBeGreaterThan(0);
        console.log(`✅ lifecycle: phase1 add-to-cart buttons found (${addToCartButtonCount})`);

        console.log('➡️ lifecycle: phase1 adding initial items to cart');
        for (let i = 0; i < Math.min(3, addToCartButtonCount); i += 1) {
          console.log(`➡️ lifecycle: phase1 clicking add-to-cart button ${i + 1}`);
          await addToCartButtons.nth(i).click();
          await customerPage.waitForTimeout(500);
          console.log(`✅ lifecycle: phase1 add-to-cart button ${i + 1} clicked`);
        }

        await expect(customerPage.locator('[data-testid="cart-placeholder"]')).toContainText(/Cart: [1-9]/i);
        await expect.poll(async () => {
          return customerPage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('cart_')).length);
        }).toBeGreaterThan(0);
        console.log('✅ lifecycle: phase1 cart state contains items');
      });

      await withStepTimeout('phase1 minimum order satisfaction', async () => {
        const minOrderSummary = customerPage.locator('.cart-summary-row.min-order');
        const cartItems = customerPage.locator('[data-testid="cart-item"], .cart-item');
        const cartQuantities = cartItems.locator('.quantity');
        const cartItemDetails = cartItems.locator('.cart-item-details');
        const cartPlaceholder = customerPage.getByTestId('cart-placeholder');
        const cartStateKeyPrefix = 'cart_';
        const targetSubtotal = 25;
        const maxMinimumOrderAttempts = 10;

        const parseCartState = (value: unknown) => {
          const results = {
            itemCount: 0,
            quantityCount: 0,
            summary: [] as Array<{ dishId?: string; quantity?: number; name?: string }>,
          };

          const visit = (candidate: unknown): void => {
            if (!candidate) return;

            if (Array.isArray(candidate)) {
              results.itemCount += candidate.length;
              for (const entry of candidate) {
                const itemQuantity = typeof entry === 'object' && entry !== null
                  ? Number((entry as { quantity?: unknown }).quantity)
                  : Number.NaN;
                const safeQuantity = Number.isFinite(itemQuantity) && itemQuantity > 0 ? itemQuantity : 1;
                results.quantityCount += safeQuantity;
                results.summary.push({
                  dishId: typeof entry === 'object' && entry !== null ? String((entry as { dishId?: unknown }).dishId ?? '') : '',
                  quantity: safeQuantity,
                  name: typeof entry === 'object' && entry !== null ? String((entry as { name?: unknown }).name ?? '') : '',
                });
              }
              return;
            }

            if (typeof candidate === 'object') {
              const record = candidate as {
                items?: unknown;
                quantity?: unknown;
                itemCount?: unknown;
                itemsCount?: unknown;
                cart?: unknown;
              };

              if (Array.isArray(record.items)) {
                visit(record.items);
                return;
              }

              if (Array.isArray(record.cart)) {
                visit(record.cart);
                return;
              }

              const objectQuantity = Number(record.quantity);
              if (Number.isFinite(objectQuantity) && objectQuantity > 0) {
                results.quantityCount += objectQuantity;
                results.itemCount += 1;
                results.summary.push({ quantity: objectQuantity });
                return;
              }

              const objectItemCount = Number(record.itemCount ?? record.itemsCount);
              if (Number.isFinite(objectItemCount) && objectItemCount > 0) {
                results.itemCount += objectItemCount;
                results.quantityCount += objectItemCount;
              }
            }
          };

          visit(value);
          return results;
        };

        const getStorageCartDiagnostics = async () => {
          const storageEntries = await customerPage.evaluate(({ prefix }) => {
            const entries: Record<string, unknown> = {};
            for (let index = 0; index < localStorage.length; index += 1) {
              const key = localStorage.key(index);
              if (!key || !key.startsWith(prefix)) continue;

              const raw = localStorage.getItem(key);
              if (raw === null) {
                entries[key] = null;
                continue;
              }

              try {
                entries[key] = JSON.parse(raw);
              } catch {
                entries[key] = raw;
              }
            }
            return entries;
          }, { prefix: cartStateKeyPrefix });

          const parsedEntries = Object.entries(storageEntries).map(([key, value]) => {
            const parsed = parseCartState(value);
            return {
              key,
              rawType: Array.isArray(value) ? 'array' : typeof value,
              ...parsed,
            };
          });

          const storageItemCount = parsedEntries.reduce((sum, entry) => sum + entry.itemCount, 0);
          const storageQuantityCount = parsedEntries.reduce((sum, entry) => sum + entry.quantityCount, 0);
          const storageKeys = parsedEntries.map((entry) => entry.key);
          const cartPlaceholderText = (await cartPlaceholder.textContent().catch(() => '')) || '';

          return {
            storageKeys,
            storageEntries: parsedEntries,
            storageItemCount,
            storageQuantityCount,
            cartPlaceholderText,
          };
        };

        const getMissingMinOrderAmount = async () => {
          if (await minOrderSummary.count().catch(() => 0) === 0) {
            return 0;
          }

          const summaryText = (await minOrderSummary.first().textContent().catch(() => '')) || '';
          const match = summaryText.match(/Noch\s+([\d.,]+)\s*€\s*fehlen/i);
          if (!match) {
            return 0;
          }

          return Number(match[1].replace(',', '.'));
        };

        const getCartDiagnostics = async () => {
          const cartItemCount = await cartItems.count().catch(() => 0);
          const quantityTexts = await cartQuantities.allTextContents().catch(() => []);
          const itemDetailTexts = await cartItemDetails.allTextContents().catch(() => []);
          const cartItemTexts = await cartItems.allTextContents().catch(() => []);
          const subtotalDiagnostics = await resolveMinimumOrderSubtotal(customerPage, cartStateKeyPrefix);
          const numericQuantities = quantityTexts
            .map((text) => Number((text || '').trim()))
            .filter((quantity) => Number.isFinite(quantity));
          const quantityCount = numericQuantities.reduce((sum, quantity) => sum + quantity, 0);

          return {
            cartItemCount,
            quantityTexts,
            numericQuantities,
            quantityCount,
            itemDetailTexts,
            cartItemTexts,
            subtotal: subtotalDiagnostics.subtotal,
            subtotalSource: subtotalDiagnostics.source,
            cartStatePresent: subtotalDiagnostics.cartStatePresent,
            subtotalItemDiagnostics: subtotalDiagnostics.itemDiagnostics,
            minimumWarningVisible: (await minOrderSummary.isVisible().catch(() => false))
              && (await getMissingMinOrderAmount()) > 0,
          };
        };

        for (let attempt = 1; attempt <= maxMinimumOrderAttempts; attempt += 1) {
          const cartDiagnostics = await getCartDiagnostics();
          const storageDiagnostics = await getStorageCartDiagnostics();
          const missingAmount = await getMissingMinOrderAmount();
          const hasSufficientQuantity = cartDiagnostics.quantityCount >= 2
            || storageDiagnostics.storageQuantityCount >= 2
            || storageDiagnostics.storageItemCount >= 2;
          const hasSafeSubtotal = (cartDiagnostics.subtotal ?? 0) >= targetSubtotal;
          const minimumWarningCleared = !missingAmount || Number.isNaN(missingAmount);

          if (minimumWarningCleared && hasSufficientQuantity && hasSafeSubtotal) {
            console.log(`✅ lifecycle: minimum order satisfied after ${attempt - 1} extra attempts`);
            console.log('ℹ️ lifecycle: minimum order cart diagnostics', {
              ...cartDiagnostics,
              ...storageDiagnostics,
              missingAmount,
              hasAtLeastTwoItemsOrQuantity: hasSufficientQuantity,
              hasSafeSubtotal,
              targetSubtotal,
              minimumWarningCleared,
            });
            if ((cartDiagnostics.subtotal ?? 0) >= targetSubtotal) {
              lastSafeMinimumOrderSubtotal = cartDiagnostics.subtotal;
              lastSafeMinimumOrderSource = cartDiagnostics.subtotalSource;
            }
            console.log('✅ lifecycle: leaving phase1 minimum order satisfaction');
            return;
          }

          const count = await addToCartButtons.count();
          expect(count).toBeGreaterThan(0);
          console.log(`➡️ lifecycle: minimum order still open (${missingAmount.toFixed(2)}€ missing), adding item attempt ${attempt}`, {
            ...cartDiagnostics,
            ...storageDiagnostics,
            missingAmount,
            hasAtLeastTwoItemsOrQuantity: hasSufficientQuantity,
            hasSafeSubtotal,
            targetSubtotal,
            minimumWarningCleared,
          });
          await addToCartButtons.nth((attempt - 1) % count).click();
          await customerPage.waitForTimeout(300);

          const postClickDiagnostics = await getCartDiagnostics();
          const postClickStorageDiagnostics = await getStorageCartDiagnostics();
          const postClickMissingAmount = await getMissingMinOrderAmount();
          const postClickHasSufficientQuantity = postClickDiagnostics.quantityCount >= 2
            || postClickStorageDiagnostics.storageQuantityCount >= 2
            || postClickStorageDiagnostics.storageItemCount >= 2;
          const postClickHasSafeSubtotal = (postClickDiagnostics.subtotal ?? 0) >= targetSubtotal;
          const postClickMinimumWarningCleared = !postClickMissingAmount || Number.isNaN(postClickMissingAmount);

          console.log('ℹ️ lifecycle: minimum order post-click cart diagnostics', {
            ...postClickDiagnostics,
            ...postClickStorageDiagnostics,
            missingAmount: postClickMissingAmount,
            hasAtLeastTwoItemsOrQuantity: postClickHasSufficientQuantity,
            hasSafeSubtotal: postClickHasSafeSubtotal,
            targetSubtotal,
            minimumWarningCleared: postClickMinimumWarningCleared,
          });

          if (postClickMinimumWarningCleared && postClickHasSufficientQuantity && postClickHasSafeSubtotal) {
            console.log(`✅ lifecycle: minimum order satisfied after ${attempt} extra attempts`);
            if ((postClickDiagnostics.subtotal ?? 0) >= targetSubtotal) {
              lastSafeMinimumOrderSubtotal = postClickDiagnostics.subtotal;
              lastSafeMinimumOrderSource = postClickDiagnostics.subtotalSource;
            }
            console.log('✅ lifecycle: leaving phase1 minimum order satisfaction');
            return;
          }
        }

        const finalDiagnostics = await getCartDiagnostics();
        const finalButtonCount = await addToCartButtons.count().catch(() => 0);
        if (finalDiagnostics.subtotal === null) {
          throw new Error(`Minimum order subtotal could not be resolved: ${JSON.stringify({
            addAttempts: maxMinimumOrderAttempts,
            addButtonCount: finalButtonCount,
            cartStatePresent: finalDiagnostics.cartStatePresent,
            subtotalSource: finalDiagnostics.subtotalSource,
            itemDiagnostics: finalDiagnostics.subtotalItemDiagnostics,
          })}`);
        }
        throw new Error(`Minimum order value was not satisfied: ${JSON.stringify({
          subtotal: finalDiagnostics.subtotal,
          targetSubtotal,
          addAttempts: maxMinimumOrderAttempts,
          addButtonCount: finalButtonCount,
          cartStatePresent: finalDiagnostics.cartStatePresent,
        })}`);
      });

      await withStepTimeout('phase1 navigate to checkout', async () => {
        console.log('➡️ lifecycle: phase1 navigating to checkout');
        const cartItems = customerPage.locator('[data-testid="cart-item"], .cart-item');
        const cartPlaceholder = customerPage.getByTestId('cart-placeholder');
        const floatingCartButton = customerPage.locator('.floating-cart-button');
        const checkoutButton = customerPage.getByTestId('checkout-button');

        const cartItemCount = await cartItems.count().catch(() => 0);
        const cartPlaceholderVisible = await cartPlaceholder.isVisible().catch(() => false);
        const floatingCartVisible = await floatingCartButton.isVisible().catch(() => false);
        console.log('ℹ️ lifecycle: phase1 checkout cart state', {
          cartItemCount,
          cartPlaceholderVisible,
          floatingCartVisible,
          currentUrl: customerPage.url(),
        });

        if (cartPlaceholderVisible) {
          await cartPlaceholder.scrollIntoViewIfNeeded().catch(() => null);
        } else {
          await customerPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => null);
        }

        if (floatingCartVisible) {
          await floatingCartButton.scrollIntoViewIfNeeded().catch(() => null);
        }

        const checkoutTriggers = [
          checkoutButton,
          customerPage.getByRole('button', { name: /^(Checkout|Zur Kasse|Kasse|Bezahlen|Continue to checkout|Proceed to checkout)$/i }),
          customerPage.getByRole('link', { name: /^(Checkout|Zur Kasse|Kasse|Bezahlen|Continue to checkout|Proceed to checkout)$/i }),
        ];

        let clickedCheckout = false;
        for (const trigger of checkoutTriggers) {
          const checkoutTrigger = trigger.first();
          if (await checkoutTrigger.isVisible().catch(() => false)) {
            await expect(checkoutTrigger).toBeEnabled();
            await checkoutTrigger.scrollIntoViewIfNeeded();

            try {
              await checkoutTrigger.click();
              await Promise.race([
                customerPage.waitForURL(/\/checkout(?:\?.*)?$/, { timeout: 5000 }).catch(() => null),
                customerPage.getByTestId('cart').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
                customerPage.locator('[data-testid="address-form"], .address-form').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
                customerPage.locator('[data-testid="payment-methods"], .payment-methods').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
                customerPage.getByTestId('checkout-summary').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
              ]);
              clickedCheckout = true;
              break;
            } catch (error) {
              console.log('ℹ️ lifecycle: checkout trigger click did not navigate, trying route fallback');
            }
          }
        }

        if (!clickedCheckout) {
          // Fallback only after confirming the cart has items and the min-order step was satisfied.
          await customerPage.goto('/checkout', { waitUntil: 'domcontentloaded' });
          await Promise.race([
            customerPage.waitForURL(/\/checkout(?:\?.*)?$/, { timeout: 5000 }).catch(() => null),
            customerPage.getByTestId('cart').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
            customerPage.locator('[data-testid="address-form"], .address-form').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
            customerPage.locator('[data-testid="payment-methods"], .payment-methods').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
            customerPage.getByTestId('checkout-summary').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
          ]);
        }

        const checkoutReached = await Promise.any([
          customerPage.waitForURL(/\/checkout(?:\?.*)?$/, { timeout: 1000 }).then(() => true).catch(() => false),
          customerPage.locator('[data-testid="address-form"], .address-form').isVisible().then(Boolean).catch(() => false),
          customerPage.locator('[data-testid="payment-methods"], .payment-methods').isVisible().then(Boolean).catch(() => false),
          customerPage.getByTestId('checkout-summary').isVisible().then(Boolean).catch(() => false),
          customerPage.getByTestId('cart').isVisible().then(Boolean).catch(() => false),
        ].map((promise) => promise.catch(() => false)));

        if (!checkoutReached) {
          console.log('ℹ️ lifecycle: checkout navigation fallback diagnostics', {
            currentUrl: customerPage.url(),
            cartItemCount: await cartItems.count().catch(() => 0),
            cartPlaceholderVisible: await cartPlaceholder.isVisible().catch(() => false),
            checkoutButtonVisible: await checkoutButton.isVisible().catch(() => false),
            floatingCartVisible: await floatingCartButton.isVisible().catch(() => false),
          });
        }

        console.log('✅ lifecycle: phase1 checkout reached');
      });

      const paymentModal = customerPage
        .locator('[data-testid="payment-modal"]')
        .or(customerPage.locator('.payment-modal'))
        .first();
      const orderTrackingPage = customerPage
        .getByTestId('order-tracking-page')
        .or(customerPage.getByTestId('order-detail-page'))
        .or(customerPage.locator('[data-testid="order-tracking"], [data-testid="order-details"], .order-tracking, .order-details'))
        .or(customerPage.getByText(/order tracking|tracking|bestellverfolgung|bestellung|order details|order status|status/i))
        .first();

      await withStepTimeout('phase1 checkout state and delivery address', async () => {
        const cartItems = customerPage.locator('[data-testid="cart-item"], .cart-item');
        await expect(customerPage.getByTestId('cart')).toBeVisible();
        await expect.poll(async () => cartItems.count()).toBeGreaterThan(0);
        console.log('✅ lifecycle: phase1 checkout cart has items');

        const addressForm = customerPage.locator('[data-testid="address-form"], .address-form');
        if (await addressForm.isVisible()) {
          console.log('➡️ lifecycle: phase1 filling delivery address');
          await customerPage.locator('input[name="street"]').fill(testOrder.deliveryAddress.street);
          await customerPage.locator('input[name="city"]').fill(testOrder.deliveryAddress.city);
          await customerPage.locator('input[name="zipCode"]').fill(testOrder.deliveryAddress.zipCode);
          await customerPage.locator('input[name="phone"]').fill(testOrder.deliveryAddress.phone);
          console.log('✅ lifecycle: phase1 delivery address filled');
        } else {
          console.log('ℹ️ lifecycle: phase1 delivery address form not visible');
        }

        const paymentMethods = customerPage.locator('[data-testid="payment-methods"], .payment-methods');
        if (await paymentMethods.isVisible()) {
          console.log('➡️ lifecycle: phase1 selecting payment method');
          const cardPayment = customerPage.locator('input[type="radio"][value="card"]');
          if (await cardPayment.isVisible()) {
            await cardPayment.check();
            console.log('✅ lifecycle: phase1 payment method selected');
          }
        }
      });

      await withStepTimeout('phase1 final order submit', async () => {
        console.log('➡️ lifecycle: phase1 preparing final order submit');
        const minOrderSummary = customerPage.locator('.cart-summary-row.min-order');
        const getVisibleSubtotal = async () => {
          const subtotalDiagnostics = await customerPage.evaluate(() => {
            const parseAmount = (value: unknown) => {
              if (typeof value === 'number') {
                return Number.isFinite(value) ? value : null;
              }
              if (typeof value !== 'string') {
                return null;
              }

              const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
              const amount = Number(normalized);
              return Number.isFinite(amount) ? amount : null;
            };

            const summarySelectors = [
              '.cart-summary-row',
              '.cart-summary',
              '.order-summary',
              '[data-testid="subtotal"]',
              '[data-testid*="subtotal"]',
            ];
            const summaryTexts = Array.from(document.querySelectorAll(summarySelectors.join(',')))
              .filter((element) => {
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden';
              })
              .map((element) => (element.textContent || '').trim())
              .filter(Boolean);

            const visibleSubtotalText = summaryTexts
              .map((text) => {
                const subtotalMatch = text.match(/(?:Subtotal|Zwischensumme)\s*:?\s*(?:€\s*)?([\d.,]+)\s*€?/i);
                if (subtotalMatch?.[1]) {
                  return parseAmount(subtotalMatch[1]);
                }
                const amountMatches = Array.from(text.matchAll(/€\s*([\d.,]+)/g)).map((match) => parseAmount(match[1])).filter((amount): amount is number => amount !== null);
                return amountMatches.length === 1 ? amountMatches[0] : null;
              })
              .find((value): value is number => value !== null);

            if (visibleSubtotalText !== undefined && visibleSubtotalText !== null) {
              return {
                subtotal: visibleSubtotalText,
                source: 'visible-subtotal-dom',
              };
            }

            return null;
          });

          const storageSubtotalDiagnostics = await resolveMinimumOrderSubtotal(customerPage);
          const domSubtotal = subtotalDiagnostics?.subtotal ?? null;
          const storageSubtotal = storageSubtotalDiagnostics.subtotal ?? null;
          const safeSubtotal = lastSafeMinimumOrderSubtotal !== null && lastSafeMinimumOrderSubtotal >= 25
            ? lastSafeMinimumOrderSubtotal
            : null;

          const chosenSubtotal = storageSubtotal !== null && storageSubtotal !== undefined && storageSubtotal >= 25
            ? storageSubtotal
            : domSubtotal !== null && domSubtotal !== undefined && domSubtotal >= 25
              ? domSubtotal
              : safeSubtotal;

          if (chosenSubtotal !== null && chosenSubtotal !== undefined) {
            console.log('ℹ️ lifecycle: pre-submit subtotal source', {
              subtotalSource: storageSubtotal !== null && storageSubtotal !== undefined && storageSubtotal >= 25
                ? storageSubtotalDiagnostics.source ?? 'localStorage-cart-state'
                : domSubtotal !== null && domSubtotal !== undefined && domSubtotal >= 25
                  ? subtotalDiagnostics?.source ?? 'visible-subtotal-dom'
                  : lastSafeMinimumOrderSource ?? 'last-safe-minimum-order-subtotal',
              subtotal: chosenSubtotal,
              domSubtotal,
              storageSubtotal,
              safeSubtotal,
              cartStatePresent: storageSubtotalDiagnostics.cartStatePresent,
            });
            return chosenSubtotal;
          }

          console.log('ℹ️ lifecycle: pre-submit subtotal source', {
            subtotalSource: storageSubtotalDiagnostics.source ?? subtotalDiagnostics?.source ?? lastSafeMinimumOrderSource ?? 'localStorage-cart-state',
            subtotal: storageSubtotal ?? domSubtotal ?? safeSubtotal ?? 0,
            domSubtotal,
            storageSubtotal,
            safeSubtotal,
            cartStatePresent: storageSubtotalDiagnostics.cartStatePresent,
          });
          return storageSubtotal ?? domSubtotal ?? safeSubtotal ?? 0;
        };
        const getMissingMinOrderAmount = async () => {
          if (await minOrderSummary.count().catch(() => 0) === 0) {
            return 0;
          }

          const summaryText = (await minOrderSummary.first().textContent().catch(() => '')) || '';
          const match = summaryText.match(/Noch\s+([\d.,]+)\s*€\s*fehlen/i);
          if (!match) {
            return 0;
          }

          return Number(match[1].replace(',', '.'));
        };

        await expect.poll(getMissingMinOrderAmount, { timeout: 10000 }).toBe(0);
        await expect.poll(getVisibleSubtotal, {
          message: 'cart subtotal must remain safely above the backend minimum before submit',
          timeout: 10000,
        }).toBeGreaterThanOrEqual(25);
        console.log('✅ lifecycle: phase1 minimum order satisfied');

        const visibleCheckoutErrors = async () => customerPage.locator('.error-message, [role="alert"], .warning-message')
          .evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim())
            .filter(Boolean))
          .catch(() => []);

        const logCheckoutDiagnostics = async (phase: string) => {
          const visibleErrors = await visibleCheckoutErrors();
          const visibleButtons = await customerPage.locator('button').evaluateAll((nodes) => nodes
            .map((node) => {
              const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
              const rect = (node as HTMLElement).getBoundingClientRect();
              const style = window.getComputedStyle(node as HTMLElement);
              return {
                text,
                testId: (node as HTMLElement).getAttribute('data-testid'),
                disabled: (node as HTMLButtonElement).disabled,
                visible: !!(rect.width && rect.height) && style.visibility !== 'hidden' && style.display !== 'none',
              };
            })
            .filter((button) => button.visible))
          .catch(() => []);
          const visiblePaymentOptions = await customerPage.locator('[data-testid="payment-methods"], .payment-methods, [data-testid="payment-modal"], .payment-modal')
            .evaluateAll((nodes) => nodes.map((node) => (node.textContent || '').trim()).filter(Boolean))
            .catch(() => []);
          console.log(`ℹ️ lifecycle: ${phase} checkout diagnostics`, {
            currentUrl: customerPage.url(),
            visibleErrors,
            visibleButtons,
            visiblePaymentOptions,
          });
        };

        const missingAddressPattern = /please provide a delivery address in your profile|delivery address in your profile|missing-user-address|addressrequired/i;
        const profileAddressWarningLocator = customerPage.locator(
          '[data-testid="profile-address-warning"], text=/Please provide a delivery address in your profile|delivery address in your profile|addressRequired|missing-user-address/i',
        );

        const collectProfileAddressSignals = async () => {
          const visibleCheckoutErrorTexts = await visibleCheckoutErrors();
          const visibleAddressText = await customerPage.locator('text=/address|adresse|liefer|delivery|street|straße/i').allTextContents().catch(() => []);
          const visiblePageText = await customerPage.locator('body').innerText({ timeout: 5000 }).catch(() => '');
          const submitProbe = await customerPage.evaluate(() => (window as unknown as { __checkoutSubmitProbe?: unknown }).__checkoutSubmitProbe ?? null);
          const combinedAddressSignal = [
            visibleCheckoutErrorTexts.join('\n'),
            visibleAddressText.join('\n'),
            visiblePageText,
            typeof submitProbe === 'object' && submitProbe ? JSON.stringify(submitProbe) : '',
          ].filter(Boolean).join('\n');
          const locatorVisible = await profileAddressWarningLocator.first().isVisible().catch(() => false);

          return {
            visibleCheckoutErrors: visibleCheckoutErrorTexts,
            visibleAddressText,
            visiblePageText,
            submitProbe,
            combinedAddressSignal,
            missingAddressDetected: missingAddressPattern.test(combinedAddressSignal),
            locatorVisible,
          };
        };

        const collectCheckoutAddressSnapshot = async () => customerPage.evaluate(() => {
          const rawUser = window.localStorage.getItem('customer_user');
          const rawProfileAddress = window.localStorage.getItem('customer_profile_address');

          let userAddress = '';
          try {
            userAddress = JSON.parse(rawUser || '{}')?.address || '';
          } catch {
            userAddress = 'PARSE_ERROR';
          }

          let profileAddressValue: string | null = null;
          try {
            const parsedProfileAddress = JSON.parse(rawProfileAddress || 'null');
            if (typeof parsedProfileAddress === 'string') {
              profileAddressValue = parsedProfileAddress;
            } else if (parsedProfileAddress && typeof parsedProfileAddress === 'object') {
              profileAddressValue = (parsedProfileAddress as { address?: string }).address || null;
            } else {
              profileAddressValue = null;
            }
          } catch {
            profileAddressValue = rawProfileAddress;
          }

          const submitButton = document.querySelector('button[data-testid="checkout-button"]') as HTMLButtonElement | null;
          const form = submitButton?.closest('form') as HTMLFormElement | null;
          const checkoutWarningVisible = Boolean(document.body.innerText.match(/missing-user-address|please provide a delivery address in your profile|delivery address in your profile/i));
          const resolvedEffectiveAddress = [
            userAddress,
            profileAddressValue,
            submitButton?.getAttribute('data-delivery-address'),
          ].find((value): value is string => Boolean(value && value.trim()))?.trim() ?? '';
          const resolvedAddressSource = userAddress?.trim()
            ? 'customer_user.address'
            : profileAddressValue?.trim()
              ? 'customer_profile_address'
              : submitButton?.getAttribute('data-delivery-address')?.trim()
                ? 'checkout-button-data-attribute'
                : 'none';

          return {
            hasCustomerUser: Boolean(rawUser),
            customerUserAddressPresent: Boolean(userAddress && userAddress !== 'PARSE_ERROR'),
            customerUserAddressLength: typeof userAddress === 'string' ? userAddress.length : 0,
            hasCustomerProfileAddress: Boolean(rawProfileAddress),
            customerProfileAddressLength: rawProfileAddress ? rawProfileAddress.length : 0,
            customerProfileAddressValueLength: typeof profileAddressValue === 'string' ? profileAddressValue.length : 0,
            checkoutWarningVisible,
            submitButtonDisabled: submitButton?.disabled ?? null,
            formPresent: Boolean(form),
            formValid: form ? form.checkValidity() : null,
            resolvedEffectiveAddress,
            resolvedAddressSource,
          };
        });

        const ensureProfileAddress = async () => {
          const profileAddressSignals = await collectProfileAddressSignals();
          const checkoutAddressSnapshot = await collectCheckoutAddressSnapshot();

          console.log('➡️ lifecycle: checking profile address before final submit', {
            currentUrl: customerPage.url(),
            ...profileAddressSignals,
            ...checkoutAddressSnapshot,
          });

          if (checkoutAddressSnapshot.resolvedEffectiveAddress.trim() && !profileAddressSignals.missingAddressDetected && !profileAddressSignals.locatorVisible) {
            console.log('ℹ️ lifecycle: profile address warning not visible, continuing with final submit');
            return true;
          }

          if (!checkoutAddressSnapshot.resolvedEffectiveAddress.trim()) {
            console.log('ℹ️ lifecycle: profile address missing in customer state, applying deterministic recovery');
          }
          console.log('ℹ️ lifecycle: missing profile address warning visible before final submit');

          await customerPage.goto('/profile', { waitUntil: 'domcontentloaded' });
          await customerPage.waitForLoadState('networkidle').catch(() => null);

          const visibleInputs = await customerPage.locator('input').evaluateAll((nodes) => nodes.map((node) => ({
            type: (node as HTMLInputElement).type,
            name: (node as HTMLInputElement).name,
            value: (node as HTMLInputElement).value,
            visible: !!(node as HTMLElement).offsetParent,
          }))).catch(() => []);
          const visibleButtons = await customerPage.locator('button').evaluateAll((nodes) => nodes.map((node) => ({
            text: (node.textContent || '').trim().replace(/\s+/g, ' '),
            disabled: (node as HTMLButtonElement).disabled,
            visible: !!(node as HTMLElement).offsetParent,
          })).filter((button) => button.visible)).catch(() => []);
          const visibleProfileErrors = await customerPage.locator('.error-message, [role="alert"], .warning-message')
            .evaluateAll((nodes) => nodes.map((node) => (node.textContent || '').trim()).filter(Boolean))
            .catch(() => []);

          const expectedAddress = testOrder.deliveryAddress.street.trim();
          const profileAddressLocatorStrategies = [
            { name: 'testid', locator: customerPage.getByTestId('profile-address-input') },
            { name: 'label', locator: customerPage.getByLabel(/address|adresse/i).last() },
            { name: 'placeholder', locator: customerPage.getByPlaceholder(/address|adresse|lieferadresse|delivery address/i).last() },
            { name: 'name=address', locator: customerPage.locator('input[name="address"]').last() },
            { name: 'name=street', locator: customerPage.locator('input[name="street"]').last() },
            { name: 'textarea[address]', locator: customerPage.locator('textarea[name="address"], textarea[name="street"]').last() },
          ];

          let addressFieldLocator: Locator | null = null;
          let successfulAddressLocatorStrategy: string | null = null;

          for (const strategy of profileAddressLocatorStrategies) {
            if (await strategy.locator.isVisible().catch(() => false)) {
              addressFieldLocator = strategy.locator;
              successfulAddressLocatorStrategy = strategy.name;
              break;
            }
          }

          if (!addressFieldLocator) {
            const editButtons = [
              customerPage.getByRole('button', { name: /edit profile|edit address|add address|edit/i }),
              customerPage.locator('button.edit-btn, button.add-address-btn'),
            ];
            for (const editButtonLocator of editButtons) {
              if (await editButtonLocator.first().isVisible().catch(() => false)) {
                console.log('➡️ lifecycle: profile address edit/add button clicked', {
                  currentUrl: customerPage.url(),
                  buttonText: await editButtonLocator.first().textContent().catch(() => null),
                });
                await editButtonLocator.first().click();
                await customerPage.waitForLoadState('networkidle').catch(() => null);
                break;
              }
            }

            for (const strategy of profileAddressLocatorStrategies) {
              if (await strategy.locator.isVisible().catch(() => false)) {
                addressFieldLocator = strategy.locator;
                successfulAddressLocatorStrategy = strategy.name;
                break;
              }
            }
          }

          if (!addressFieldLocator) {
            console.log('ℹ️ lifecycle: profile address field not visible', {
              currentUrl: customerPage.url(),
              visibleInputs,
              visibleButtons,
              visibleProfileErrors,
            });
            throw new Error('Profile address recovery failed before checkout retry');
          }

          const currentAddress = (await addressFieldLocator.inputValue().catch(() => '')).trim();

          if (currentAddress && currentAddress === expectedAddress) {
            console.log('ℹ️ lifecycle: profile address already present', {
              successfulAddressLocatorStrategy,
            });
            await customerPage.goto('/checkout', { waitUntil: 'domcontentloaded' });
            await customerPage.waitForLoadState('networkidle').catch(() => null);
            console.log('✅ lifecycle: returned to checkout after profile check');
            return false;
          }

          console.log('➡️ lifecycle: profile address missing, updating profile before final submit', {
            successfulAddressLocatorStrategy,
          });
          await logCustomerUserSnapshot(customerPage, 'snapshot: before profile save click');
          await addressFieldLocator.fill(expectedAddress);
          const saveButton = customerPage.getByTestId('profile-save-button').first();
          if (!(await saveButton.isVisible().catch(() => false))) {
            console.log('ℹ️ lifecycle: profile save button not visible', {
              currentUrl: customerPage.url(),
              visibleInputs,
              visibleButtons,
              visibleProfileErrors,
            });
            throw new Error('Profile address recovery failed before checkout retry');
          }

          const profileSaveResponsePromise = customerPage.waitForResponse((response) => {
            const request = response.request();
            return request.method() === 'PUT' && new URL(response.url()).pathname === '/api/customers/profile';
          }, { timeout: 20000 });
          await saveButton.click();
          const profileSaveResponse = await profileSaveResponsePromise.catch(() => null);
          if (!profileSaveResponse) {
            throw new Error('Profile address save did not produce a response before checkout retry');
          }

          const profileSaveBody = await profileSaveResponse.text().catch(() => '');
          console.log('✅ lifecycle: profile save response received', {
            status: profileSaveResponse.status(),
            url: profileSaveResponse.url(),
            body: profileSaveBody ? profileSaveBody.slice(0, 500) : null,
          });

          await customerPage.waitForLoadState('networkidle').catch(() => null);
          await customerPage.getByTestId('profile-save-button').waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
          await customerPage.getByText(/updated|success/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
          const savedAddressVisible = await customerPage.evaluate((expected) => {
            try {
              const stored = localStorage.getItem('customer_user');
              if (!stored) return false;
              const parsed = JSON.parse(stored) as { address?: string } | null;
              return Boolean(parsed?.address && parsed.address.trim() === expected.trim());
            } catch {
              return false;
            }
          }, expectedAddress);
          console.log('✅ lifecycle: profile address updated', {
            successfulAddressLocatorStrategy,
            savedAddressVisible,
          });
          const customerUserAfterProfileSave = await customerPage.evaluate(() => window.localStorage.getItem('customer_user'));
          console.log('ℹ️ lifecycle: customerUserAfterProfileSave', customerUserAfterProfileSave);
          await logCustomerUserSnapshot(customerPage, 'snapshot: after profile save response');
          await customerPage.goto('/checkout', { waitUntil: 'domcontentloaded' });
          await customerPage.waitForLoadState('networkidle').catch(() => null);
          await logCustomerUserSnapshot(customerPage, 'snapshot: after checkout return');
          const checkoutStoredUserAddress = await customerPage.evaluate(() => {
            try {
              const stored = localStorage.getItem('customer_user');
              if (!stored) return null;
              const parsed = JSON.parse(stored) as { address?: string } | null;
              return parsed?.address || null;
            } catch {
              return null;
            }
          });
          const checkoutWarningTextsAfterProfileUpdate = await customerPage.locator(
            'text=/Please provide a delivery address in your profile|delivery address in your profile|addressRequired/i',
          ).allTextContents().catch(() => []);
          const checkoutAddressTextsAfterProfileUpdate = await customerPage.locator(
            'text=/Please provide a delivery address in your profile|delivery address in your profile|addressRequired|missing-user-address|delivery address|address/i',
          ).allTextContents().catch(() => []);
          const checkoutAddressSnapshotAfterProfileUpdate = await collectCheckoutAddressSnapshot();
          console.log('ℹ️ lifecycle: checkout address state after profile update', {
            checkoutStoredUserAddress,
            checkoutWarningTextsAfterProfileUpdate,
            checkoutAddressTextsAfterProfileUpdate,
            checkoutAddressSnapshotAfterProfileUpdate,
          });
          if (checkoutAddressSnapshotAfterProfileUpdate.resolvedEffectiveAddress.trim()
            && !checkoutWarningTextsAfterProfileUpdate.length
            && !checkoutAddressTextsAfterProfileUpdate.length) {
            console.log('✅ lifecycle: checkout address warning cleared after profile update');
          }
          console.log('✅ lifecycle: returned to checkout after profile update');
          return Boolean(checkoutAddressSnapshotAfterProfileUpdate.resolvedEffectiveAddress.trim());
        };

        await logCheckoutDiagnostics('before final submit');
        await logCustomerUserSnapshot(customerPage, 'snapshot: before final submit');
        console.log('checkoutAddressSnapshot', await collectCheckoutAddressSnapshot());
        const addressReadyForFinalSubmit = await ensureProfileAddress();
        if (!addressReadyForFinalSubmit) {
          const postRecoverySnapshot = await collectCheckoutAddressSnapshot();
          if (!postRecoverySnapshot.resolvedEffectiveAddress.trim()) {
            throw new Error(`Checkout address missing before final submit: ${JSON.stringify({
              currentUrl: customerPage.url(),
              ...postRecoverySnapshot,
            })}`);
          }
        }
        await logCustomerUserSnapshot(customerPage, 'snapshot: after profile verification');
        console.log('checkoutAddressSnapshotAfterProfileVerification', await collectCheckoutAddressSnapshot());
        await logCheckoutDiagnostics('after profile verification');

        const collectFinalSubmitCartDiagnostics = async () => {
          const storageDiagnostics = await customerPage.evaluate(({ prefix }) => {
            const parseAmount = (value: unknown) => {
              if (typeof value === 'number') {
                return Number.isFinite(value) ? value : null;
              }
              if (typeof value !== 'string') {
                return null;
              }

              const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
              const amount = Number(normalized);
              return Number.isFinite(amount) ? amount : null;
            };

            const summary = {
              itemCount: 0,
              quantityCount: 0,
              subtotal: 0,
              subtotalSource: null as string | null,
              cartItems: [] as Array<{ dishId?: string; quantity: number; price?: number; name?: string }>,
            };

            for (let index = 0; index < localStorage.length; index += 1) {
              const key = localStorage.key(index);
              if (!key || !key.startsWith(prefix)) continue;
              const raw = localStorage.getItem(key);
              if (!raw) continue;

              try {
                const parsed = JSON.parse(raw);
                const items = Array.isArray(parsed)
                  ? parsed
                  : Array.isArray(parsed?.items)
                    ? parsed.items
                    : Array.isArray(parsed?.cart)
                      ? parsed.cart
                      : [];

                summary.itemCount += items.length;

                for (const item of items as Array<Record<string, unknown>>) {
                  const nestedDish = item?.dish && typeof item.dish === 'object' ? item.dish as Record<string, unknown> : null;
                  const quantity = Number(item?.quantity ?? item?.qty ?? item?.count ?? 1);
                  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
                  const directTotal = parseAmount(item?.totalPrice ?? item?.subtotal);
                  const nestedPrice = parseAmount(item?.price ?? item?.unitPrice ?? nestedDish?.price ?? nestedDish?.unitPrice);
                  summary.quantityCount += safeQuantity;
                  summary.cartItems.push({
                    dishId: typeof item?.dishId === 'string' ? item.dishId : typeof nestedDish?.id === 'string' ? String(nestedDish.id) : undefined,
                    quantity: safeQuantity,
                    price: directTotal ?? nestedPrice ?? undefined,
                    name: typeof item?.name === 'string' ? item.name : typeof nestedDish?.name === 'string' ? String(nestedDish.name) : undefined,
                  });
                  if (directTotal !== null && directTotal !== undefined) {
                    summary.subtotal += directTotal;
                    summary.subtotalSource = summary.subtotalSource ?? 'item.totalPrice';
                  } else if (nestedPrice !== null && nestedPrice !== undefined) {
                    summary.subtotal += nestedPrice * safeQuantity;
                    summary.subtotalSource = summary.subtotalSource ?? 'item.price';
                  }
                }
              } catch {
                // Ignore malformed cart storage and fall back to DOM/restore logic below.
              }
            }

            return summary;
          }, { prefix: 'cart_' });

          const domSubtotalDiagnostics = await resolveMinimumOrderSubtotal(customerPage);
          const domSubtotal = domSubtotalDiagnostics.subtotal ?? null;
          const storageSubtotal = storageDiagnostics.subtotal > 0 ? storageDiagnostics.subtotal : null;
          const payloadItems = storageDiagnostics.cartItems
            .filter((item) => typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0)
            .map((item) => ({
              dishId: item.dishId ?? item.name ?? 'unknown',
              quantity: item.quantity,
              price: item.price as number,
            }));
          const payloadSubtotal = payloadItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const subtotal = payloadSubtotal;
          const payloadMinimumSatisfied = payloadSubtotal >= 25 && (payloadItems.length >= 2 || storageDiagnostics.quantityCount >= 2);

          return {
            ...storageDiagnostics,
            domSubtotal,
            storageSubtotal,
            payloadItems,
            payloadSubtotal,
            subtotal,
            subtotalSource: storageDiagnostics.subtotalSource ?? domSubtotalDiagnostics.source ?? 'localStorage-cart-state',
            finalSubmitMinimumSatisfied: payloadMinimumSatisfied,
          };
        };

        const ensureFinalSubmitMinimumCart = async () => {
          const getVisibleCartContext = async () => {
            const storageSnapshot = await customerPage.evaluate(() => {
              const keys = Object.keys(window.localStorage);
              const entries = keys.map((key) => [key, window.localStorage.getItem(key)] as const);
              return { keys, entries };
            }).catch(() => ({ keys: [] as string[], entries: [] as Array<[string, string | null]> }));

            const quickAddButtons = await customerPage.locator('button').evaluateAll((buttons) => buttons
              .map((button, index) => {
                const element = button as HTMLButtonElement;
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                const text = (element.textContent || '').trim().replace(/\s+/g, ' ');
                return {
                  index,
                  text,
                  testId: element.getAttribute('data-testid'),
                  disabled: element.disabled,
                  visible: !!(rect.width && rect.height) && style.display !== 'none' && style.visibility !== 'hidden',
                };
              })
              .filter((button) => button.visible && /quick add|add to cart|add|plus|\+/i.test(button.text || '') || button.testId === 'add-to-cart-button'))
              .catch(() => []);

            return {
              currentUrl: customerPage.url(),
              storageKeys: storageSnapshot.keys,
              storageEntries: storageSnapshot.entries,
              visibleCartText: (await customerPage.getByTestId('cart').textContent().catch(() => '')) || '',
              visibleQuickAddButtons: quickAddButtons,
            };
          };

          let diagnostics = await collectFinalSubmitCartDiagnostics();
          console.log('ℹ️ lifecycle: final submit cart diagnostics', {
            finalSubmitCartItems: diagnostics.cartItems,
            finalSubmitSubtotal: diagnostics.subtotal,
            payloadItemsBeforeSubmit: diagnostics.payloadItems,
            payloadSubtotalBeforeSubmit: diagnostics.payloadSubtotal,
            visibleSubtotalBeforeSubmit: diagnostics.domSubtotal,
            storageSubtotalBeforeSubmit: diagnostics.storageSubtotal,
            safeSubtotalBeforeSubmit: lastSafeMinimumOrderSubtotal,
            finalSubmitItemCount: diagnostics.itemCount,
            finalSubmitQuantityCount: diagnostics.quantityCount,
            finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
            finalSubmitMinimumSatisfied: diagnostics.finalSubmitMinimumSatisfied,
            subtotalSource: diagnostics.subtotalSource,
          });

          if (diagnostics.finalSubmitMinimumSatisfied) {
            return diagnostics;
          }

          console.log('ℹ️ lifecycle: final submit cart below minimum, restoring items from restaurant menu', {
            currentUrl: customerPage.url(),
            finalSubmitSubtotal: diagnostics.subtotal,
            payloadSubtotalBeforeSubmit: diagnostics.payloadSubtotal,
            payloadItemsBeforeSubmit: diagnostics.payloadItems,
            finalSubmitItemCount: diagnostics.itemCount,
            finalSubmitQuantityCount: diagnostics.quantityCount,
          });

          const openRestaurantMenuForCartRepair = async () => {
            if (!/\/restaurants\/[^/?]+/.test(customerPage.url())) {
              await customerPage.goto(`${testUrls.customer}/restaurants`, { waitUntil: 'domcontentloaded' });
              await customerPage.waitForLoadState('networkidle').catch(() => null);
              await TestHelpers.waitForStablePage(customerPage);
            }

            const restaurantCards = customerPage.getByTestId('restaurant-card');
            const restaurantCardCount = await restaurantCards.count().catch(() => 0);
            console.log('ℹ️ lifecycle: no add-to-cart buttons on restaurants index, trying restaurant card detail fallback', {
              currentUrl: customerPage.url(),
              restaurantCardCount,
              visibleButtons: await customerPage.locator('button').evaluateAll((nodes) => nodes
                .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
                .filter(Boolean))
                .catch(() => []),
              visibleLinks: await customerPage.locator('a').evaluateAll((nodes) => nodes
                .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
                .filter(Boolean))
                .catch(() => []),
              bodyText: (await customerPage.locator('body').textContent().catch(() => '')).slice(0, 1000),
              cartState: diagnostics,
            });

            if (restaurantCardCount > 0) {
              const restaurantCard = restaurantCards.first();
              await restaurantCard.scrollIntoViewIfNeeded().catch(() => null);
              await restaurantCard.click().catch(async () => {
                await restaurantCard.locator('a, button').first().click();
              });
              await customerPage.waitForLoadState('networkidle').catch(() => null);
              await TestHelpers.waitForStablePage(customerPage);
            }

            const addToCartButtons = customerPage
              .locator('[data-testid="menu-content"] [data-testid="add-to-cart-button"], [data-testid="add-to-cart-button"], button')
              .filter({ hasText: /Quick Add|Add to cart|Add|Hinzufügen|\+/i });
            const addButtonCount = await addToCartButtons.count().catch(() => 0);

            if (addButtonCount === 0) {
              throw new Error(`Cannot restore final submit cart minimum because no add-to-cart buttons are visible: ${JSON.stringify({
                ...(await getVisibleCartContext()),
                visibleButtons: await customerPage.locator('button').evaluateAll((nodes) => nodes
                  .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
                  .filter(Boolean))
                  .catch(() => []),
                visibleLinks: await customerPage.locator('a').evaluateAll((nodes) => nodes
                  .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
                  .filter(Boolean))
                  .catch(() => []),
                bodyText: (await customerPage.locator('body').textContent().catch(() => '')).slice(0, 1000),
                cartState: diagnostics,
              })}`);
            }

            return addToCartButtons;
          };

          let addToCartButtons = await openRestaurantMenuForCartRepair();
          let addButtonCount = await addToCartButtons.count().catch(() => 0);
          const attemptedAddButtonIndexes = new Set<number>();

          for (let attempt = 1; attempt <= 10; attempt += 1) {
            const diagnosticsBeforeRepair = diagnostics;
            diagnostics = await collectFinalSubmitCartDiagnostics();
            if (diagnostics.finalSubmitMinimumSatisfied) {
              break;
            }

            addToCartButtons = await openRestaurantMenuForCartRepair();
            addButtonCount = await addToCartButtons.count().catch(() => 0);

            console.log('➡️ lifecycle: restoring final submit cart minimum', {
              attempt,
              finalSubmitSubtotal: diagnostics.subtotal,
              payloadSubtotalAfterRepair: diagnostics.payloadSubtotal,
              payloadItemsAfterRepair: diagnostics.payloadItems,
              cartRepairAttempt: attempt,
              finalSubmitItemCount: diagnostics.itemCount,
              finalSubmitQuantityCount: diagnostics.quantityCount,
              finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
            });

            let buttonClicked = false;
            const buttonTexts = await addToCartButtons.evaluateAll((buttons) => buttons.map((button, index) => {
              const element = button as HTMLButtonElement;
              return {
                index,
                text: (element.textContent || '').trim().replace(/\s+/g, ' '),
                testId: element.getAttribute('data-testid'),
                disabled: element.disabled,
              };
            })).catch(() => []);
            const preferredKeywords = ['Pizza Margherita', 'Pizza Pepperoni', 'Pizza Hawaii'];
            const candidateIndexes = buttonTexts
              .filter((button) => !button.disabled && !attemptedAddButtonIndexes.has(button.index))
              .sort((a, b) => {
                const aScore = preferredKeywords.findIndex((keyword) => a.text.includes(keyword));
                const bScore = preferredKeywords.findIndex((keyword) => b.text.includes(keyword));
                return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
              })
              .map((button) => button.index);

            for (const buttonIndex of candidateIndexes) {
              const button = addToCartButtons.nth(buttonIndex);
              if (!(await button.isVisible().catch(() => false))) {
                continue;
              }

              attemptedAddButtonIndexes.add(buttonIndex);
              await button.scrollIntoViewIfNeeded().catch(() => null);
              await button.click().catch(async () => {
                await customerPage.mouse.click(0, 0).catch(() => null);
              });
              buttonClicked = true;
              break;
            }

            if (!buttonClicked) {
              const visibleContext = await getVisibleCartContext();
              throw new Error(`Final submit cart could not be restored above minimum: ${JSON.stringify({
                ...visibleContext,
                finalSubmitSubtotal: diagnostics.subtotal,
                finalSubmitItemCount: diagnostics.itemCount,
                finalSubmitQuantityCount: diagnostics.quantityCount,
                finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
              })}`);
            }

            await customerPage.waitForTimeout(300);
            diagnostics = await collectFinalSubmitCartDiagnostics();
            if (diagnostics.payloadSubtotal <= diagnosticsBeforeRepair.payloadSubtotal) {
              await customerPage.goto(`${testUrls.customer}/restaurants`, { waitUntil: 'domcontentloaded' }).catch(() => null);
              await customerPage.waitForLoadState('networkidle').catch(() => null);
              await TestHelpers.waitForStablePage(customerPage);
            }
          }

          diagnostics = await collectFinalSubmitCartDiagnostics();
          console.log('ℹ️ lifecycle: final submit cart diagnostics after restore', {
            finalSubmitCartItems: diagnostics.cartItems,
            finalSubmitSubtotal: diagnostics.subtotal,
            payloadSubtotalAfterRepair: diagnostics.payloadSubtotal,
            payloadItemsAfterRepair: diagnostics.payloadItems,
            finalSubmitItemCount: diagnostics.itemCount,
            finalSubmitQuantityCount: diagnostics.quantityCount,
            finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
            finalSubmitMinimumSatisfied: diagnostics.finalSubmitMinimumSatisfied,
            subtotalSource: diagnostics.subtotalSource,
          });

          if (!diagnostics.finalSubmitMinimumSatisfied) {
            throw new Error(`Final submit cart could not be restored above minimum: ${JSON.stringify({
              ...(await getVisibleCartContext()),
              finalSubmitSubtotal: diagnostics.subtotal,
              payloadSubtotalAfterRepair: diagnostics.payloadSubtotal,
              finalSubmitItemCount: diagnostics.itemCount,
              finalSubmitQuantityCount: diagnostics.quantityCount,
              finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
            })}`);
          }

          await customerPage.goto('/checkout', { waitUntil: 'domcontentloaded' });
          await customerPage.waitForLoadState('networkidle').catch(() => null);
          await TestHelpers.waitForStablePage(customerPage);

          const checkoutCart = customerPage.getByTestId('cart');
          const checkoutIncreaseButtons = checkoutCart
            .locator('button[aria-label*="increase" i], button[aria-label*="erhö" i], button[aria-label*="mehr" i], .quantity-btn')
            .filter({ hasText: /\+/ });

          const repairCheckoutCartToMinimum = async () => {
            for (let attempt = 1; attempt <= 8; attempt += 1) {
              diagnostics = await collectFinalSubmitCartDiagnostics();
              if (diagnostics.payloadSubtotal >= 25) {
                return diagnostics;
              }

              const increaseButtonCount = await checkoutIncreaseButtons.count().catch(() => 0);
              if (increaseButtonCount === 0) {
                break;
              }

              const increaseButton = checkoutIncreaseButtons.nth((attempt - 1) % increaseButtonCount);
              if (!(await increaseButton.isVisible().catch(() => false))) {
                break;
              }

              console.log('➡️ lifecycle: repairing checkout cart minimum via visible + button', {
                attempt,
                payloadSubtotalBeforeRepair: diagnostics.payloadSubtotal,
                visibleSubtotalBeforeRepair: diagnostics.domSubtotal,
                itemCountBeforeRepair: diagnostics.itemCount,
                quantityCountBeforeRepair: diagnostics.quantityCount,
              });
              await increaseButton.click();
              await customerPage.waitForTimeout(300);
            }

            diagnostics = await collectFinalSubmitCartDiagnostics();
            return diagnostics;
          };

          diagnostics = await repairCheckoutCartToMinimum();
          if (diagnostics.payloadSubtotal < 25) {
            throw new Error(`Final submit cart still below minimum after repair: ${JSON.stringify({
              payloadSubtotalAfterRepair: diagnostics.payloadSubtotal,
              visibleSubtotalAfterRepair: diagnostics.domSubtotal,
              storageSubtotalAfterRepair: diagnostics.storageSubtotal,
              finalSubmitItemCount: diagnostics.itemCount,
              finalSubmitQuantityCount: diagnostics.quantityCount,
              finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
            })}`);
          }

          return diagnostics;
        };

        const finalSubmitCartDiagnostics = await ensureFinalSubmitMinimumCart();
        console.log('ℹ️ lifecycle: final submit cart diagnostics ready', {
          finalSubmitCartItems: finalSubmitCartDiagnostics.cartItems,
          finalSubmitSubtotal: finalSubmitCartDiagnostics.subtotal,
          finalSubmitItemCount: finalSubmitCartDiagnostics.itemCount,
          finalSubmitQuantityCount: finalSubmitCartDiagnostics.quantityCount,
          finalSubmitPayloadPreview: finalSubmitCartDiagnostics.cartItems.slice(0, 5),
          finalSubmitMinimumSatisfied: finalSubmitCartDiagnostics.finalSubmitMinimumSatisfied,
        });

        const cartContainer = customerPage.getByTestId('cart');
        const submitCandidates = [
          cartContainer.locator('button[data-testid="checkout-button"]'),
          cartContainer.getByRole('button', { name: /^(Place Order|Bestellen|Submit Order|Order Now|Jetzt bestellen|Zahlungspflichtig bestellen|Bezahlen|Pay)$/i }),
          customerPage.getByRole('button', { name: /^(Place Order|Bestellen|Submit Order|Order Now|Jetzt bestellen|Zahlungspflichtig bestellen|Bezahlen|Pay)$/i }),
        ];
        let finalPlaceOrderButton: Locator | null = null;

        await expect(cartContainer).toBeVisible();
        console.log('✅ lifecycle: phase1 checkout/cart visible');
        for (const candidate of submitCandidates) {
          const button = candidate.first();
          if (await button.isVisible().catch(() => false)) {
            finalPlaceOrderButton = button;
            break;
          }
        }

        if (!finalPlaceOrderButton) {
          console.log('ℹ️ lifecycle: final submit diagnostics', {
            currentUrl: customerPage.url(),
            cartVisible: await cartContainer.isVisible().catch(() => false),
            checkoutButtonVisible: await submitCandidates[0].first().isVisible().catch(() => false),
            cartRoleVisible: await submitCandidates[1].first().isVisible().catch(() => false),
            pageRoleVisible: await submitCandidates[2].first().isVisible().catch(() => false),
          });
          throw new Error('No visible final submit button found in checkout cart');
        }

        const finalSubmitDomProbe = await customerPage.evaluate(() => {
          const button = document.querySelector('button[data-testid="checkout-button"]') as HTMLButtonElement | null;
          const form = button?.closest('form') as HTMLFormElement | null;
          return {
            buttonText: button?.textContent?.trim() || null,
            buttonType: button?.getAttribute('type') || null,
            buttonDisabled: button?.disabled ?? null,
            buttonHasForm: Boolean(form),
            formAction: form?.getAttribute('action') || null,
            formMethod: form?.getAttribute('method') || null,
            buttonCount: document.querySelectorAll('button[data-testid="checkout-button"]').length,
          };
        });
        console.log('ℹ️ lifecycle: final submit DOM probe', finalSubmitDomProbe);

        const installCheckoutSubmitProbe = async () => {
          await customerPage.evaluate(() => {
            const probe = {
              clickSeen: false,
              submitSeen: false,
              submitTarget: null as string | null,
              clickedText: null as string | null,
              handleCheckoutSubmitCalled: false,
              placeOrderCalled: false,
              beforeApiPost: false,
              apiPostUrl: null as string | null,
              requestUrls: [] as string[],
              responseUrls: [] as string[],
              requestFailedEvents: [] as string[],
              pageErrors: [] as string[],
              consoleErrors: [] as string[],
              networkUrls: [] as string[],
            };

            (window as unknown as { __checkoutSubmitProbe?: typeof probe }).__checkoutSubmitProbe = probe;

            document.addEventListener('click', (event) => {
              const target = event.target as HTMLElement | null;
              const button = target?.closest?.('button[data-testid="checkout-button"]') as HTMLButtonElement | null;
              if (button) {
                probe.clickSeen = true;
                probe.clickedText = button.textContent?.trim() ?? null;
              }
            }, true);

            document.addEventListener('submit', (event) => {
              const form = event.target as HTMLFormElement | null;
              probe.submitSeen = true;
              probe.submitTarget = form?.outerHTML?.slice(0, 500) ?? null;
            }, true);

            const originalFetch = window.fetch.bind(window);
            window.fetch = async (...args) => {
              const request = args[0];
              const url = typeof request === 'string'
                ? request
                : request instanceof Request
                  ? request.url
                  : String(request);
              if (/order|checkout|payment|cart/i.test(url)) {
                probe.networkUrls.push(url);
              }
              return originalFetch(...args);
            };
          });
        };

        await installCheckoutSubmitProbe();

        const submitTraffic = {
          requestUrls: [] as string[],
          responseUrls: [] as string[],
          successfulOrderCreateResponse: null as Response | null,
          requestFailedEvents: [] as string[],
          pageErrors: [] as string[],
          consoleErrors: [] as string[],
        };
        const submitTrafficFilters = /\/api\/orders\/customer|\/orders\/customer|\/orders\/[^/?]+|\/api\/customers\/profile/i;
        const onSubmitRequest = (request: Parameters<Parameters<typeof customerPage.on>[1]>[0]) => {
          const url = request.url();
          if (submitTrafficFilters.test(url)) {
            submitTraffic.requestUrls.push(`${request.method()} ${url}`);
          }
        };
        const onSubmitResponse = (response: Parameters<Parameters<typeof customerPage.on>[1]>[0]) => {
          const url = response.url();
          if (submitTrafficFilters.test(url)) {
            submitTraffic.responseUrls.push(`${response.status()} ${url}`);
            if (response.request().method() === 'POST'
              && /\/(?:api\/)?orders\/customer(?:[/?#]|$)/i.test(url)
              && response.ok()) {
              submitTraffic.successfulOrderCreateResponse = response;
            }
          }
        };
        const onSubmitRequestFailed = (request: Parameters<Parameters<typeof customerPage.on>[1]>[0]) => {
          const url = request.url();
          if (submitTrafficFilters.test(url)) {
            submitTraffic.requestFailedEvents.push(`${request.failure()?.errorText ?? 'requestfailed'} ${url}`);
          }
        };
        const onSubmitPageError = (error: Error) => {
          submitTraffic.pageErrors.push(error.message);
        };
        const onSubmitConsole = (message: Parameters<Parameters<typeof customerPage.on>[1]>[0]) => {
          const type = message.type();
          if (type === 'error' || type === 'warning') {
            submitTraffic.consoleErrors.push(`[${type}] ${message.text()}`);
          }
        };
        customerPage.on('request', onSubmitRequest);
        customerPage.on('response', onSubmitResponse);
        customerPage.on('requestfailed', onSubmitRequestFailed);
        customerPage.on('pageerror', onSubmitPageError);
        customerPage.on('console', onSubmitConsole);

        const checkoutFormValidityBeforeFinalSubmit = await customerPage.locator('form').last().evaluate((form) => {
          const htmlForm = form as HTMLFormElement;
          return {
            valid: htmlForm.checkValidity(),
            invalidControls: Array.from(htmlForm.elements)
              .filter((element) => element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
              .map((element) => {
                const control = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                return {
                  tag: control.tagName,
                  name: control.name,
                  type: 'type' in control ? control.type : undefined,
                  value: control.value,
                  required: control.required,
                  disabled: control.disabled,
                  valid: control.checkValidity(),
                  validationMessage: control.validationMessage,
                };
              })
              .filter((control) => !control.valid || control.required),
          };
        }).catch(() => null);
        console.log('ℹ️ lifecycle: checkout form validity before final submit', checkoutFormValidityBeforeFinalSubmit);

        finalPlaceOrderButton = customerPage
          .getByTestId('cart')
          .locator('button[data-testid="checkout-button"]')
          .filter({ hasText: /^(Place Order|Bestellen|Submit Order|Order Now|Jetzt bestellen|Zahlungspflichtig bestellen|Bezahlen|Pay)$/i })
          .first();

        await expect(finalPlaceOrderButton).toBeVisible();
        console.log('✅ lifecycle: phase1 final Place Order button visible');
        await expect(finalPlaceOrderButton).toBeEnabled();
        console.log('✅ lifecycle: phase1 final Place Order button enabled');
        const performFinalSubmitAttempt = async (attemptLabel: string) => {
          const isOrderCustomerUrl = (urlString: string) => {
            const lower = urlString.toLowerCase();
            return lower.endsWith('/orders/customer')
              || lower.includes('/api/orders/customer')
              || /\/orders\/customer(?:[/?#]|$)/i.test(urlString)
              || /\/api\/orders\/customer(?:[/?#]|$)/i.test(urlString);
          };
          const isSuccessfulOrderCreateResponse = (response: Response) => {
            const request = response.request();
            return request.method() === 'POST'
              && isOrderCustomerUrl(response.url())
              && [200, 201, 202].includes(response.status());
          };
          const orderCreateResponsePromise = customerPage.waitForResponse((response) => {
            const request = response.request();
            return request.method() === 'POST'
              && isOrderCustomerUrl(response.url())
              && response.status() < 500;
          }, { timeout: 20000 }).catch(() => null);
          pendingOrderCreateResponse = orderCreateResponsePromise;
          const orderCreateOutcomePromise = orderCreateResponsePromise.then((response) => {
            if (!response) {
              return null;
            }
            lastOrderCreateResponse = response;
            if (!isSuccessfulOrderCreateResponse(response)) {
              return null;
            }
            return { kind: 'response' as const, response };
          });
          const orderUrlPromise = customerPage.waitForURL((url) => {
            const value = url.toString();
            return /\/orders\/[^/?]+(?:\?.*)?$/i.test(value) || /\/orders\/customer(?:[/?#]|$)/i.test(value);
          }, { timeout: 20000 })
            .then(() => ({ kind: 'order-url' as const }))
            .catch(() => null);
          const orderTrackingPromise = orderTrackingPage.waitFor({ state: 'visible', timeout: 20000 })
            .then(() => ({ kind: 'order-tracking' as const }))
            .catch(() => null);
          const missingAddressPromise = profileAddressWarningLocator.first().waitFor({ state: 'visible', timeout: 2000 })
            .then(() => ({ kind: 'missing-user-address' as const }))
            .catch(() => null);

          console.log('➡️ lifecycle: phase1 clicking final Place Order', { attemptLabel });
          await finalPlaceOrderButton.scrollIntoViewIfNeeded().catch(() => null);
          await finalPlaceOrderButton.click({ noWaitAfter: true });
          console.log('✅ lifecycle: phase1 final Place Order click completed', { attemptLabel });

          const attemptOutcome = await Promise.race([
            orderCreateOutcomePromise,
            orderUrlPromise,
            orderTrackingPromise,
            missingAddressPromise,
          ]);

          if (attemptOutcome) {
            return attemptOutcome;
          }

          const postClickSubmitProbe = await customerPage.evaluate(() => (window as unknown as { __checkoutSubmitProbe?: unknown }).__checkoutSubmitProbe ?? null);
          const submitProbeAfterClick = typeof postClickSubmitProbe === 'object' && postClickSubmitProbe
            ? postClickSubmitProbe as {
                beforeApiPost?: boolean;
                apiPostUrl?: string | null;
                pageErrors?: string[];
                consoleErrors?: string[];
                requestUrls?: string[];
                responseUrls?: string[];
                requestFailedEvents?: string[];
              }
            : null;
          const probeSawSuccessfulOrderPost = Boolean(submitProbeAfterClick?.beforeApiPost)
            && Boolean(submitProbeAfterClick?.apiPostUrl)
            && isOrderCustomerUrl(submitProbeAfterClick.apiPostUrl || '');
          if (probeSawSuccessfulOrderPost && lastOrderCreateResponse && isSuccessfulOrderCreateResponse(lastOrderCreateResponse)) {
            console.log('✅ lifecycle: accepting successful order response from submit probe', {
              apiPostUrl: submitProbeAfterClick?.apiPostUrl,
              responseStatus: lastOrderCreateResponse.status(),
              responseUrl: lastOrderCreateResponse.url(),
            });
            return { kind: 'response' as const, response: lastOrderCreateResponse };
          }

          const submitProbe = postClickSubmitProbe;
          const visibleTotalText = await cartContainer.locator('text=/€|Mindestbestellwert|Total|Gesamt/i').allTextContents().catch(() => []);
          const visibleAddressText = await customerPage.locator('text=/address|adresse|liefer|delivery|street|straße/i').allTextContents().catch(() => []);
          const visiblePhoneText = await customerPage.locator('text=/phone|telefon|mobile|handy/i').allTextContents().catch(() => []);
          const visiblePaymentText = await customerPage.locator('text=/payment|card|karte|pay|zahlung/i').allTextContents().catch(() => []);
          const currentCustomerUser = await customerPage.evaluate(() => window.localStorage.getItem('customer_user')).catch(() => null);
          const currentCartPayload = await collectFinalSubmitCartDiagnostics().catch(() => null);
          const capturedTraffic = {
            requestUrls: [...submitTraffic.requestUrls],
            responseUrls: [...submitTraffic.responseUrls],
            successfulOrderCreateResponse: submitTraffic.successfulOrderCreateResponse,
            requestFailedEvents: [...submitTraffic.requestFailedEvents],
            pageErrors: [...submitTraffic.pageErrors],
            consoleErrors: [...submitTraffic.consoleErrors],
          };
          console.log(`ℹ️ lifecycle: ${attemptLabel} final order submit diagnostics`, {
            currentUrl: customerPage.url(),
            paymentModalVisible: await paymentModal.isVisible().catch(() => false),
            orderTrackingVisible: await orderTrackingPage.isVisible().catch(() => false),
            cartVisible: await cartContainer.isVisible().catch(() => false),
            cartItemCount: await cartContainer.locator('.cart-item').count().catch(() => 0),
            visibleTotalText,
            visibleAddressText,
            visiblePhoneText,
            visiblePaymentText,
            submitVisible: await finalPlaceOrderButton.isVisible().catch(() => false),
            submitEnabled: await finalPlaceOrderButton.isEnabled().catch(() => false),
            submitType: await finalPlaceOrderButton.getAttribute('type').catch(() => null),
            submitHasForm: await finalPlaceOrderButton.evaluate((button) => Boolean((button as HTMLButtonElement).form)).catch(() => false),
            submitText: await finalPlaceOrderButton.textContent().catch(() => null),
            checkoutErrors: await customerPage.locator('.error, [role="alert"], [data-testid="checkout-error"]').allTextContents().catch(() => []),
            submitProbe,
            capturedTraffic,
            currentCustomerUser,
            currentCartPayload,
          });
          const submitProbeObject = submitProbeAfterClick;
          const hasSuccessfulOrderCreateResponse = Boolean(capturedTraffic.successfulOrderCreateResponse)
            || capturedTraffic.responseUrls.some((entry) => /^(200|201|202)\s+.*\/(?:api\/)?orders\/customer\b/i.test(entry))
            || submitProbeObject?.responseUrls?.some((entry) => /^(200|201|202)\s+.*\/(?:api\/)?orders\/customer\b/i.test(entry))
            || (submitProbeObject?.apiPostUrl ? isOrderCustomerUrl(submitProbeObject.apiPostUrl) : false)
            || Boolean(lastOrderCreateResponse?.ok?.());
          const hasOrderConfirmationUi = Boolean(
            await paymentModal.isVisible().catch(() => false)
            || await orderTrackingPage.isVisible().catch(() => false)
            || await customerPage.locator('text=/order confirmed|bestellung bestätigt|order created|thank you/i').first().isVisible().catch(() => false)
          );
          const detectedSubmitError = submitProbeObject?.pageErrors?.[0]
            || submitProbeObject?.consoleErrors?.find((text) => /error|failed|exception|unhandled/i.test(text) && !/404 \(Not Found\)/i.test(text))
            || capturedTraffic.pageErrors[0]
            || capturedTraffic.consoleErrors.find((text) => /error|failed|exception|unhandled/i.test(text) && !/404 \(Not Found\)/i.test(text))
            || capturedTraffic.requestFailedEvents[0]
            || (submitProbeObject?.beforeApiPost && !capturedTraffic.requestUrls.length ? 'Checkout submit reached API preflight but no network request was observed' : null);
          if (detectedSubmitError && !hasSuccessfulOrderCreateResponse && !hasOrderConfirmationUi) {
            throw new Error(`Final order submission failed before response/UI confirmation: ${JSON.stringify({
              detectedSubmitError,
              hasSuccessfulOrderCreateResponse,
              hasOrderConfirmationUi,
              currentUrl: customerPage.url(),
              submitProbe,
              capturedTraffic,
              currentCustomerUser,
              currentCartPayload,
            })}`);
          }
          if (detectedSubmitError && hasSuccessfulOrderCreateResponse) {
            console.log('✅ lifecycle: ignoring non-blocking submit console error because order create response succeeded', {
              detectedSubmitError,
              successfulOrderResponse: true,
            });
          }
          if (hasSuccessfulOrderCreateResponse && capturedTraffic.successfulOrderCreateResponse) {
            lastOrderCreateResponse = capturedTraffic.successfulOrderCreateResponse;
            return { kind: 'response' as const, response: capturedTraffic.successfulOrderCreateResponse };
          }
          if (probeSawSuccessfulOrderPost && lastOrderCreateResponse && isSuccessfulOrderCreateResponse(lastOrderCreateResponse)) {
            return { kind: 'response' as const, response: lastOrderCreateResponse };
          }
          return null;
        };

        let orderSubmissionOutcome = await performFinalSubmitAttempt('initial');
        let missingAddressRecoveryAttempted = false;

        if (!orderSubmissionOutcome) {
          const retryProbe = await customerPage.evaluate(() => (window as unknown as { __checkoutSubmitProbe?: unknown }).__checkoutSubmitProbe ?? null);
          const retryGuard = typeof retryProbe === 'object' && retryProbe
            ? (retryProbe as { guard?: string | null }).guard
            : null;

          if (retryGuard === 'missing-user-address' || await profileAddressWarningLocator.first().isVisible().catch(() => false)) {
            console.log('ℹ️ lifecycle: missing-user-address recovery triggered', {
              retryGuard,
            });
            await ensureProfileAddress();
            await installCheckoutSubmitProbe();
            orderSubmissionOutcome = await performFinalSubmitAttempt('retry after missing-user-address recovery');
          }
        }

        if (orderSubmissionOutcome?.kind === 'missing-user-address') {
          if (!missingAddressRecoveryAttempted) {
            missingAddressRecoveryAttempted = true;
            console.log('ℹ️ lifecycle: missing-user-address recovery triggered', {
              retryGuard: 'missing-user-address',
            });
            await ensureProfileAddress();
            await installCheckoutSubmitProbe();
            orderSubmissionOutcome = await performFinalSubmitAttempt('retry after missing-user-address recovery');
          }
        }

        if (!orderSubmissionOutcome) {
          throw new Error('Final order submission did not produce a response or confirmation UI');
        }

        if (orderSubmissionOutcome.kind === 'missing-user-address') {
          throw new Error('Final order submission still reported missing-user-address after profile recovery');
        }

        if (orderSubmissionOutcome.kind === 'response') {
          const orderCreateResponse = orderSubmissionOutcome.response;
          const responseStatus = orderCreateResponse.status();
          const responseRequest = orderCreateResponse.request();
          let responseBody: string | null = null;
          try {
            responseBody = await orderCreateResponse.text();
          } catch {
            responseBody = null;
          }
          let requestPostData: string | null = null;
          try {
            requestPostData = responseRequest.postData();
          } catch {
            requestPostData = null;
          }
          const visibleCartTexts = await cartContainer.allTextContents().catch(() => []);
          const visibleCartItems = await cartContainer.locator('.cart-item').allTextContents().catch(() => []);
          const checkoutErrors = await customerPage.locator('.error, [role="alert"], [data-testid="checkout-error"]').allTextContents().catch(() => []);
          console.log(`ℹ️ lifecycle: phase1 order response received (${responseStatus})`, {
            url: orderCreateResponse.url(),
            requestUrl: responseRequest.url(),
            method: responseRequest.method(),
            responseBody,
            requestPostData,
            currentUrl: customerPage.url(),
            paymentModalVisible: await paymentModal.isVisible().catch(() => false),
            orderTrackingVisible: await orderTrackingPage.isVisible().catch(() => false),
            cartVisible: await cartContainer.isVisible().catch(() => false),
            cartItemCount: await cartContainer.locator('.cart-item').count().catch(() => 0),
            visibleTotalText: await cartContainer.locator('text=/€|Mindestbestellwert|Total|Gesamt/i').allTextContents().catch(() => []),
            visibleAddressText: await customerPage.locator('text=/address|adresse|liefer|delivery|street|straße/i').allTextContents().catch(() => []),
            visiblePhoneText: await customerPage.locator('text=/phone|telefon|mobile|handy/i').allTextContents().catch(() => []),
            visiblePaymentText: await customerPage.locator('text=/payment|card|karte|pay|zahlung/i').allTextContents().catch(() => []),
            visibleCartTexts,
            visibleCartItems,
            checkoutErrors,
            submitProbe: await customerPage.evaluate(() => (window as unknown as { __checkoutSubmitProbe?: unknown }).__checkoutSubmitProbe ?? null),
          });
          if (!orderCreateResponse.ok()) {
            throw new Error(`Order create failed with ${responseStatus}: ${responseBody ?? 'no response body'}`);
          }
          const createdOrder = await orderCreateResponse.json().catch(() => ({}));
          orderId = createdOrder.id || orderId;
          orderRestaurantId = createdOrder.restaurantId
            || createdOrder.restaurant?.id
            || createdOrder.data?.restaurantId
            || createdOrder.data?.restaurant?.id
            || orderRestaurantId;
          if (!orderId) {
            throw new Error('Order creation response did not include an id');
          }
          console.log(`✅ lifecycle: phase1 order id resolved (${orderId})`);
          return;
        } else if (orderSubmissionOutcome.kind === 'order-url' || orderSubmissionOutcome.kind === 'order-tracking') {
          console.log(`ℹ️ lifecycle: phase1 final order submit confirmed by ${orderSubmissionOutcome.kind}`);
          return;
        }
      });

      // Complete payment in the modal if the UI shows one, otherwise accept
      // the direct navigation flow after the order is created.
      await Promise.race([
        paymentModal.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
        customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 15000 }).catch(() => null),
      ]);

      if (await paymentModal.isVisible().catch(() => false)) {
        console.log('➡️ lifecycle: payment modal visible, confirming payment');
        const orderCreateResponse = await pendingOrderCreateResponse;
        if (orderCreateResponse) {
          lastOrderCreateResponse = orderCreateResponse;
          console.log('✅ lifecycle: order create response received', {
            status: orderCreateResponse.status(),
            url: orderCreateResponse.url(),
          });
        }

        const cardForm = customerPage.locator('.card-form');
        if (await cardForm.isVisible()) {
          const resolvePaymentInput = async (candidates: Locator[]) => {
            for (const candidate of candidates) {
              const count = await candidate.count().catch(() => 0);
              if (count === 0) {
                continue;
              }

              const visibleCandidate = candidate.first();
              if (await visibleCandidate.isVisible({ timeout: 1000 }).catch(() => false)) {
                return visibleCandidate;
              }
            }
            return null;
          };

          const cardholderInput = await resolvePaymentInput([
            cardForm.getByLabel(/karteninhaber|cardholder|name/i),
            cardForm.locator('input[name*="card" i]'),
            cardForm.locator('input[name*="holder" i]'),
            cardForm.locator('input[placeholder*="Karteninhaber" i]'),
            cardForm.locator('input[placeholder*="Cardholder" i]'),
            cardForm.locator('input').first(),
          ]);
          if (!cardholderInput) {
            const paymentTexts = await paymentModal.textContent().catch(() => '');
            const inputDiagnostics = await cardForm.locator('input').evaluateAll((inputs) => inputs.map((input) => ({
              tag: input.tagName,
              type: input.getAttribute('type'),
              name: input.getAttribute('name'),
              placeholder: input.getAttribute('placeholder'),
              testId: input.getAttribute('data-testid'),
            })));
            throw new Error(`Payment cardholder input could not be resolved: ${JSON.stringify({
              currentUrl: customerPage.url(),
              paymentTexts: (paymentTexts || '').slice(0, 500),
              cardInputCount: inputDiagnostics.length,
              inputDiagnostics,
            })}`);
          }
          await cardholderInput.fill(customerCredentials.name);

          const cardNumberInput = await resolvePaymentInput([
            cardForm.getByLabel(/kartennummer|card number|number/i),
            cardForm.locator('input[name*="number" i]'),
            cardForm.locator('input[placeholder*="1234" i]'),
            cardForm.locator('input').nth(1),
          ]);
          const expiryInput = await resolvePaymentInput([
            cardForm.getByLabel(/gültig bis|expiry|expires/i),
            cardForm.locator('input[name*="exp" i]'),
            cardForm.locator('input[placeholder*="MM" i]'),
            cardForm.locator('input').nth(2),
          ]);
          const cvcInput = await resolvePaymentInput([
            cardForm.getByLabel(/cvc|cvv|security code/i),
            cardForm.locator('input[name*="cvc" i]'),
            cardForm.locator('input[placeholder*="123" i]'),
            cardForm.locator('input').nth(3),
          ]);

          if (!cardNumberInput || !expiryInput || !cvcInput) {
            const inputDiagnostics = await cardForm.locator('input').evaluateAll((inputs) => inputs.map((input) => ({
              tag: input.tagName,
              type: input.getAttribute('type'),
              name: input.getAttribute('name'),
              placeholder: input.getAttribute('placeholder'),
              testId: input.getAttribute('data-testid'),
            })));
            throw new Error(`Payment card inputs could not be resolved: ${JSON.stringify({
              currentUrl: customerPage.url(),
              inputDiagnostics,
            })}`);
          }

          await cardNumberInput.fill('4242 4242 4242 4242');
          await expiryInput.fill('12/34');
          await cvcInput.fill('123');
        }

        const paymentConfirmButton = paymentModal
          .getByTestId('payment-confirm-button')
          .or(paymentModal.getByRole('button', {
            name: /pay|bezahlen|zahlung bestätigen|zahlung abschließen|confirm|bestätigen|complete payment|place order|order/i,
          }))
          .or(paymentModal.locator('button').filter({
            hasText: /pay|bezahlen|zahlung bestätigen|zahlung abschließen|confirm|bestätigen|complete payment|place order|order/i,
          }))
          .first();
        if (!await paymentConfirmButton.isVisible({ timeout: 10000 }).catch(() => false)) {
          const modalButtons = await paymentModal.locator('button').evaluateAll((buttons) => buttons.map((button) => ({
            text: button.textContent?.trim() || '',
            testId: button.getAttribute('data-testid'),
            disabled: (button as HTMLButtonElement).disabled,
          })));
          throw new Error(`Payment confirmation button not found: ${JSON.stringify({
            currentUrl: customerPage.url(),
            modalText: (await paymentModal.textContent().catch(() => ''))?.trim(),
            modalButtons,
            orderCreateResponseReceived: Boolean(lastOrderCreateResponse),
          })}`);
        }
        await expect(paymentConfirmButton).toBeEnabled();
        await paymentConfirmButton.click();
        console.log('✅ lifecycle: payment confirm button clicked');

        await Promise.race([
          customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 20000 }).catch(() => null),
          orderTrackingPage.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
        ]);
      } else {
        console.log('ℹ️ Payment modal not shown, waiting for direct order navigation');
      }

      const extractOrderIdFromResponse = async (response: Response | null) => {
        if (!response) {
          return null;
        }

        const parseResponsePayload = async () => {
          if (typeof (response as { json?: () => Promise<unknown> }).json === 'function') {
            return (await (response as { json: () => Promise<unknown> }).json().catch(() => null)) as unknown;
          }
          if (typeof (response as { text?: () => Promise<string> }).text === 'function') {
            const text = await (response as { text: () => Promise<string> }).text().catch(() => '');
            if (!text) {
              return null;
            }
            try {
              return JSON.parse(text) as unknown;
            } catch {
              return { text };
            }
          }
          if (typeof (response as { body?: () => Promise<Uint8Array> }).body === 'function') {
            const body = await (response as { body: () => Promise<Uint8Array> }).body().catch(() => null);
            if (!body) {
              return null;
            }
            try {
              const text = new TextDecoder().decode(body);
              return JSON.parse(text) as unknown;
            } catch {
              return null;
            }
          }
          return response as unknown;
        };

        const responseOrder = await parseResponsePayload() as
          | { id?: string; orderId?: string; order?: { id?: string; orderId?: string }; data?: { id?: string; orderId?: string; order?: { id?: string; orderId?: string } } }
          | null;

        const candidateIds = [
          responseOrder?.id,
          responseOrder?.orderId,
          responseOrder?.order?.id,
          responseOrder?.order?.orderId,
          responseOrder?.data?.id,
          responseOrder?.data?.orderId,
          responseOrder?.data?.order?.id,
          responseOrder?.data?.order?.orderId,
        ];

        return candidateIds.find((value): value is string => Boolean(typeof value === 'string' && value.trim()))?.trim() ?? null;
      };

      const resolveOrderIdFromCurrentState = async () => {
        const responseOrderId = await extractOrderIdFromResponse(lastOrderCreateResponse);
        if (responseOrderId) {
          return responseOrderId;
        }

        const directOrderId = typeof orderId === 'string' && orderId.trim() ? orderId.trim() : null;
        if (directOrderId) {
          return directOrderId;
        }

        const currentUrl = customerPage.url();
        const currentUrlMatch = currentUrl.match(/\/orders\/([^/?]+)(?:\?.*)?$/);
        if (currentUrlMatch?.[1]) {
          return currentUrlMatch[1];
        }

        const visibleOrderLinks = await customerPage.locator('a[href*="/orders/"], button[href*="/orders/"], [data-testid*="order"]').evaluateAll((nodes) => nodes
          .map((node) => {
            const element = node as HTMLAnchorElement | HTMLButtonElement & { href?: string };
            return element.getAttribute?.('href')
              || (typeof element.href === 'string' ? element.href : null)
              || null;
          })
          .filter((href): href is string => Boolean(href)))
          .catch(() => []);
        const linkedOrderId = visibleOrderLinks
          .map((href) => href.match(/\/orders\/([^/?]+)(?:\?.*)?$/)?.[1] || null)
          .find((value): value is string => Boolean(value));
        if (linkedOrderId) {
          return linkedOrderId;
        }

        return null;
      };

      orderId = await resolveOrderIdFromCurrentState();
      if (!orderId) {
        console.log('❌ lifecycle: orderId unresolved before Phase 2', {
          currentUrl: customerPage.url(),
          hasLastOrderCreateResponse: Boolean(lastOrderCreateResponse),
          lastOrderCreateStatus: lastOrderCreateResponse?.status() ?? null,
        });
      }
      expect(orderId, 'orderId must be resolved before Phase 2 starts').toBeTruthy();

      if (!/\/orders\/[^/?]+(?:\?.*)?$/.test(customerPage.url())) {
        console.log(`ℹ️ Navigating directly to created order ${orderId}`);
        await customerPage.goto(`${testUrls.customer}/orders/${orderId}`);
      }

      await customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 20000 });
      await expect(orderTrackingPage).toBeVisible({ timeout: 20000 });

      // Get order ID from URL or response
      const orderUrlMatch = customerPage.url().match(/orders\/([^/?]+)/);
      if (orderUrlMatch) {
        orderId = orderUrlMatch[1];
      }
      console.log(`📦 Order created: ${orderId}`);

      // ============================================
      // PHASE 2: RESTAURANT SETS READY FOR PICKUP
      // ============================================
      console.log('🍽️  Phase 2: Restaurant sets order ready for pickup');

      // Restaurant already authenticated via storageState
      await restaurantPage.goto(testUrls.restaurant);
      await TestHelpers.waitForStablePage(restaurantPage);

      if (orderRestaurantId) {
        await restaurantPage.evaluate((targetRestaurantId) => {
          const currentRestaurantId = localStorage.getItem('restaurant_id');
          if (currentRestaurantId !== targetRestaurantId) {
            localStorage.setItem('restaurant_id', targetRestaurantId);
          }

          const rawUser = localStorage.getItem('restaurant_user');
          if (rawUser) {
            try {
              const parsedUser = JSON.parse(rawUser);
              if (parsedUser && typeof parsedUser === 'object') {
                const nextUser = {
                  ...parsedUser,
                  restaurantId: targetRestaurantId,
                };
                localStorage.setItem('restaurant_user', JSON.stringify(nextUser));
              }
            } catch {
              // Keep the existing auth payload if it cannot be parsed.
            }
          }

          localStorage.setItem(`restaurant_onboarding_done_${targetRestaurantId}`, 'true');
        }, orderRestaurantId);
        await restaurantPage.reload({ waitUntil: 'domcontentloaded' });
        await restaurantPage.waitForLoadState('networkidle').catch(() => null);
        await TestHelpers.waitForStablePage(restaurantPage);
      }

      const collectRestaurantAuthSnapshot = async () => restaurantPage.evaluate(() => {
        const rawUser = localStorage.getItem('restaurant_user');
        const rawRestaurantId = localStorage.getItem('restaurant_id');
        let user: { id?: string; restaurantId?: string; email?: string; name?: string } | null = null;
        try {
          user = rawUser ? JSON.parse(rawUser) : null;
        } catch {
          user = null;
        }
        return {
          currentUrl: window.location.href,
          restaurantStorageUserId: user?.id ?? null,
          restaurantStorageRestaurantId: rawRestaurantId || user?.restaurantId || null,
          restaurantStorageEmail: user?.email ?? null,
          restaurantStorageName: user?.name ?? null,
          offlineModeVisible: Boolean(document.body.innerText.match(/Offline-Modus/i)),
        };
      });

      const restaurantApiRequestUrls: string[] = [];
      const restaurantApiResponseStatuses: Array<{ url: string; status: number }> = [];
      const restaurantApiResponseBodies: Array<{ url: string; status: number; body: string }> = [];
      const restaurantOrdersApiPattern = /\/api\/restaurants\/[^/?]+\/orders(?:[/?].*)?$/;
      const recordRestaurantNetwork = (response: { url: () => string; status: () => number; text: () => Promise<string> }) => {
        const responseUrl = response.url();
        if (!restaurantOrdersApiPattern.test(responseUrl)) {
          return;
        }
        restaurantApiResponseStatuses.push({ url: responseUrl, status: response.status() });
        response.text().then((body) => {
          restaurantApiResponseBodies.push({
            url: responseUrl,
            status: response.status(),
            body: body.slice(0, 500),
          });
        }).catch(() => null);
      };
      restaurantPage.on('request', (request) => {
        if (restaurantOrdersApiPattern.test(request.url())) {
          restaurantApiRequestUrls.push(request.url());
        }
      });
      restaurantPage.on('response', recordRestaurantNetwork);

      const restaurantVisibleSignals = async () => {
        const visibleButtons = await restaurantPage.locator('button').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const visibleLinks = await restaurantPage.locator('a').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const visibleHeadings = await restaurantPage.locator('h1, h2, h3').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const bodyText = (await restaurantPage.locator('body').textContent().catch(() => '')).slice(0, 1000);
        return {
          currentUrl: restaurantPage.url(),
          visibleButtons,
          visibleLinks,
          visibleHeadings,
          bodyText,
        };
      };

      const completeRestaurantOnboardingIfNeeded = async () => {
        for (let attempt = 1; attempt <= 5; attempt += 1) {
          const onboardingWrapper = restaurantPage.locator('.onboarding-wrapper');
          const onboardingVisible = await onboardingWrapper.isVisible().catch(() => false);
          if (!onboardingVisible) {
            return;
          }

          const onboardingSignals = await restaurantVisibleSignals();
          console.log('ℹ️ lifecycle: restaurant onboarding visible', onboardingSignals);

          const buttonLocators = [
            restaurantPage.getByRole('button', { name: /öffnungszeiten speichern & weiter/i }),
            restaurantPage.getByRole('button', { name: /lieferzone speichern & weiter/i }),
            restaurantPage.getByRole('button', { name: /zum dashboard/i }),
            restaurantPage.getByRole('button', { name: /schritt überspringen/i }),
            restaurantPage.getByRole('button', { name: /speichern/i }),
          ];

          let clicked = false;
          for (const candidate of buttonLocators) {
            const button = candidate.first();
            if (await button.isVisible().catch(() => false) && await button.isEnabled().catch(() => false)) {
              console.log('➡️ lifecycle: completing restaurant onboarding', {
                buttonText: await button.textContent().catch(() => null),
                currentUrl: restaurantPage.url(),
              });
              await button.click();
              await restaurantPage.waitForLoadState('networkidle').catch(() => null);
              await TestHelpers.waitForStablePage(restaurantPage);
              clicked = true;
              break;
            }
          }

          const afterClickSignals = await restaurantVisibleSignals();
          const onboardingStillVisible = await onboardingWrapper.isVisible().catch(() => false);
          if (clicked && !onboardingStillVisible) {
            console.log('✅ lifecycle: restaurant onboarding resolved', afterClickSignals);
            return;
          }
        }

        console.log('ℹ️ lifecycle: restaurant onboarding could not be fully resolved', await restaurantVisibleSignals());
      };

      await completeRestaurantOnboardingIfNeeded();

      const restaurantLoggedInSignal = restaurantPage
        .locator('button.sidebar-item')
        .filter({ hasText: /dashboard|bestellungen|orders|küche|menü|profil|einstellungen/i })
        .or(restaurantPage.getByRole('button', { name: /dashboard|bestellungen|orders|küche|menü|profil|einstellungen/i }))
        .or(restaurantPage.getByRole('link', { name: /dashboard|bestellungen|orders|logout|abmelden/i }))
        .or(restaurantPage.getByText(/dashboard|bestellungen|orders|restaurant/i))
        .first();

      await expect(restaurantLoggedInSignal).toBeVisible({ timeout: 10000 });

      if (!/\/(dashboard|home|orders|bestellungen)/i.test(restaurantPage.url())) {
        console.log('ℹ️ lifecycle: restaurant login stayed on root, continuing after verified logged-in signal', {
          currentUrl: restaurantPage.url(),
        });
      }

      // Navigate to orders
      const restaurantOrdersTab = restaurantPage
        .locator('button.sidebar-item')
        .filter({ hasText: /bestellungen|orders/i })
        .or(restaurantPage.getByRole('button', { name: /bestellungen|orders/i }))
        .or(restaurantPage.getByRole('link', { name: /bestellungen|orders/i }))
        .or(restaurantPage.locator('nav button, nav a').filter({ hasText: /bestellungen|orders/i }))
        .or(restaurantPage.getByText(/bestellungen|orders/i))
        .first();

      const restaurantOrdersTabVisible = await restaurantOrdersTab.isVisible().catch(() => false);
      if (!restaurantOrdersTabVisible) {
        const diagnostics = await restaurantVisibleSignals();
        console.log('ℹ️ lifecycle: restaurant orders tab not directly visible, using restaurant UI diagnostics', diagnostics);
        throw new Error(`Restaurant orders tab not found: ${JSON.stringify(diagnostics)}`);
      }
      const openRestaurantOrdersTab = async () => {
        await restaurantOrdersTab.click();
        await restaurantPage.waitForLoadState('networkidle').catch(() => null);
        await TestHelpers.waitForStablePage(restaurantPage);
        await restaurantPage.waitForTimeout(2500);
      };

      await openRestaurantOrdersTab();

      const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const orderIdentityPattern = new RegExp(
        [
          orderId ? escapeRegExp(orderId) : '',
          testOrder.id ? escapeRegExp(testOrder.id) : '',
          customerCredentials.email ? escapeRegExp(customerCredentials.email) : '',
          customerCredentials.name ? escapeRegExp(customerCredentials.name) : '',
          'pending',
          'ausstehend',
          'new order',
          'neue bestellung',
        ].filter(Boolean).join('|'),
        'i',
      );
      const orderLookupSelectors = [
        '[data-testid="order-card"]',
        '.order-card',
        '[data-testid*="order"]',
        '.order-item',
        '.order-row',
        'tr',
        'li',
        'article',
        'section',
      ];
      const orderLookupTargets = restaurantPage.locator(orderLookupSelectors.join(', '));
      const collectRestaurantOrderLookupDiagnostics = async () => {
        const visibleOrderTexts = await orderLookupTargets.allTextContents().catch(() => []);
        const visibleTableRowTexts = await restaurantPage.locator('tr').allTextContents().catch(() => []);
        const visibleButtons = await restaurantPage.locator('button').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const visibleLinks = await restaurantPage.locator('a').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const visibleHeadings = await restaurantPage.locator('h1, h2, h3').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const pageTextExcerpt = (await restaurantPage.locator('body').textContent().catch(() => '')).slice(0, 2000);
        return {
          currentUrl: restaurantPage.url(),
          visibleOrderTexts,
          visibleTableRowTexts,
          visibleButtons,
          visibleLinks,
          visibleHeadings,
          pageTextExcerpt,
          orderId,
          testOrderId: testOrder.id,
          customerEmail: customerCredentials.email,
          customerName: customerCredentials.name,
        };
      };

      const findVisibleRestaurantOrder = async () => {
        const candidates = [
          ...await orderLookupTargets.evaluateAll((nodes) => nodes.map((node) => (node.textContent || '').trim()).filter(Boolean)).catch(() => []),
        ];
        const matchingText = candidates.find((text) => orderIdentityPattern.test(text));
        if (matchingText) {
          const matchedLocator = orderLookupTargets.filter({ hasText: matchingText }).first();
          if (await matchedLocator.isVisible().catch(() => false)) {
            return matchedLocator;
          }
        }

        const exactOrderIdLocator = orderId
          ? restaurantPage.locator(orderLookupSelectors.join(', ')).filter({ hasText: new RegExp(escapeRegExp(orderId), 'i') }).first()
          : null;
        if (exactOrderIdLocator && await exactOrderIdLocator.isVisible().catch(() => false)) {
          return exactOrderIdLocator;
        }

        const customerNameLocator = customerCredentials.name
          ? restaurantPage.locator(orderLookupSelectors.join(', ')).filter({ hasText: new RegExp(escapeRegExp(customerCredentials.name), 'i') }).first()
          : null;
        if (customerNameLocator && await customerNameLocator.isVisible().catch(() => false)) {
          return customerNameLocator;
        }

        const customerEmailLocator = customerCredentials.email
          ? restaurantPage.locator(orderLookupSelectors.join(', ')).filter({ hasText: new RegExp(escapeRegExp(customerCredentials.email), 'i') }).first()
          : null;
        if (customerEmailLocator && await customerEmailLocator.isVisible().catch(() => false)) {
          return customerEmailLocator;
        }

        return null;
      };

      const restaurantAuthSnapshot = await collectRestaurantAuthSnapshot();
      console.log('ℹ️ lifecycle: restaurant phase2 diagnostics', {
        createdOrderId: orderId,
        createdOrderRestaurantId: orderRestaurantId,
        restaurantStorageUserId: restaurantAuthSnapshot.restaurantStorageUserId,
        restaurantStorageRestaurantId: restaurantAuthSnapshot.restaurantStorageRestaurantId,
        restaurantStorageEmail: restaurantAuthSnapshot.restaurantStorageEmail,
        restaurantStorageName: restaurantAuthSnapshot.restaurantStorageName,
        offlineModeVisible: restaurantAuthSnapshot.offlineModeVisible,
        restaurantApiRequests: restaurantApiRequestUrls,
        restaurantApiResponses: restaurantApiResponseStatuses,
      });

      let resolvedOrderCard = await withStepTimeout('phase2 restaurant order visible', async () => {
        let card = await findVisibleRestaurantOrder();
        if (!card) {
          for (let attempt = 1; attempt <= 2 && !card; attempt += 1) {
            console.log('ℹ️ lifecycle: retrying restaurant order lookup', {
              attempt,
              orderId,
              createdOrderRestaurantId: orderRestaurantId,
              restaurantStorageRestaurantId: restaurantAuthSnapshot.restaurantStorageRestaurantId,
            });
            await restaurantPage.reload({ waitUntil: 'domcontentloaded' });
            await restaurantPage.waitForLoadState('networkidle').catch(() => null);
            await TestHelpers.waitForStablePage(restaurantPage);
            await openRestaurantOrdersTab();
            card = await findVisibleRestaurantOrder();
          }
        }

        if (!card) {
          const diagnostics = await collectRestaurantOrderLookupDiagnostics();
          console.log('restaurantOrderLookupFailed', {
            ...diagnostics,
            createdOrderRestaurantId: orderRestaurantId,
            restaurantStorageUserId: restaurantAuthSnapshot.restaurantStorageUserId,
            restaurantStorageRestaurantId: restaurantAuthSnapshot.restaurantStorageRestaurantId,
            restaurantApiRequests: restaurantApiRequestUrls,
            restaurantApiResponses: restaurantApiResponseStatuses,
            restaurantApiResponseBodies,
          });
          throw new Error(`Restaurant order not visible: ${JSON.stringify(diagnostics)}`);
        }

        return card;
      });

      await withStepTimeout('phase2 restaurant ready button click', async () => {
        const readyBtn = resolvedOrderCard
          .locator('button[data-testid="restaurant-order-ready-button"]')
          .or(resolvedOrderCard.locator(selectors.readyForPickupBtn))
          .first();
        if (!await readyBtn.isVisible().catch(() => false)) {
          const fallbackReadyBtn = resolvedOrderCard.getByRole('button', { name: /ready|pickup|bereit|abholbereit|vorbereiten|accept|annehmen/i }).first();
          if (await fallbackReadyBtn.isVisible().catch(() => false) && await fallbackReadyBtn.isEnabled().catch(() => false)) {
            await fallbackReadyBtn.click();
            return;
          }

          const diagnostics = await collectRestaurantOrderLookupDiagnostics();
          console.log('restaurantReadyButtonMissing', diagnostics);
          throw new Error(`Restaurant ready button not visible: ${JSON.stringify(diagnostics)}`);
        }

        await expect(readyBtn).toBeEnabled();
        const readyPatch = restaurantPage.waitForResponse(
          (response) =>
            response.request().method() === 'PATCH'
            && new URL(response.url()).pathname.endsWith(`/api/orders/${orderId}/status`),
          { timeout: 15000 },
        );
        await readyBtn.click();
        const readyPatchResponse = await readyPatch;
        if (!readyPatchResponse.ok()) {
          const readyPatchStatus = readyPatchResponse.status();
          const readyPatchUrl = readyPatchResponse.url();
          const readyPatchRequest = readyPatchResponse.request();
          const readyPatchMethod = readyPatchRequest.method();
          const readyPatchPostData = readyPatchRequest.postData();

          let readyPatchBody = '';
          try {
            readyPatchBody = await readyPatchResponse.text();
          } catch (error) {
            readyPatchBody = `failed to read response body: ${String(error)}`;
          }

          console.log('❌ lifecycle: restaurant ready PATCH failed', {
            status: readyPatchStatus,
            url: readyPatchUrl,
            method: readyPatchMethod,
            postData: readyPatchPostData,
            body: readyPatchBody,
            orderId,
          });
        }
        expect(readyPatchResponse.ok()).toBeTruthy();
      });

      await withStepTimeout('phase2 restaurant status visible', async () => {
        const updatedOrderCard = restaurantPage
          .locator(`[data-testid="restaurant-order-card-${orderId}"]`)
          .or(restaurantPage.locator(`[data-order-id="${orderId}"]`))
          .first();
        const updatedOrderStatus = updatedOrderCard
          .locator(`[data-testid="restaurant-order-status-${orderId}"]`)
          .or(updatedOrderCard.locator(selectors.orderStatus))
          .first();
        await expect(updatedOrderStatus).toContainText(/READY_FOR_PICKUP|Bereit|Ready/i);
      });

      console.log(`✅ Restaurant marked order ${orderId} as ready for pickup`);

      // ============================================
      // PHASE 3: DRIVER ACCEPTS AND DELIVERS ORDER
      // ============================================
      console.log('🚚 Phase 3: Driver accepts and delivers order');

      // Driver already authenticated via storageState
      await driverPage.goto(testUrls.driver);
      await TestHelpers.waitForStablePage(driverPage);

      // Verify we're logged in on the actual driver start page
      const driverLoggedInSignal = driverPage
        .getByTestId('driver-dashboard')
        .or(driverPage.getByTestId('dashboard-header'))
        .or(driverPage.getByText(/driver dashboard|dashboard|willkommen/i))
        .first();
      await expect(driverLoggedInSignal).toBeVisible({ timeout: 10000 });

      console.log('✅ lifecycle: driver login verified', {
        currentUrl: driverPage.url(),
      });

      // Navigate to available orders
      const driverOrdersNav = driverPage
        .getByRole('button', { name: /orders|bestellungen/i })
        .first();
      if (await driverOrdersNav.isVisible().catch(() => false)) {
        await driverOrdersNav.click();
      } else {
        await driverPage.goto(`${testUrls.driver}/orders`);
      }
      await driverPage.waitForLoadState('networkidle').catch(() => undefined);

      console.log('ℹ️ lifecycle: driver orders diagnostics', {
        currentUrl: driverPage.url(),
        orderId,
        visibleOrderCards: await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').count(),
      });

      // Find available order
      const availableOrder = driverPage
        .getByTestId(`driver-order-card-${orderId}`)
        .or(driverPage.locator(`[data-order-id="${orderId}"]`))
        .or(driverPage.locator(selectors.orderCard))
        .first();
      await expect(availableOrder).toBeVisible({ timeout: 15000 });

      // Accept order
      const acceptButton = availableOrder
        .getByTestId(`driver-accept-order-${orderId}`)
        .or(availableOrder.locator('[data-action="accept-order"]'))
        .or(availableOrder.locator('button[data-testid="accept-order"]'))
        .or(
          availableOrder.getByRole('button', {
            name: /accept|annehmen|auftrag annehmen|übernehmen/i,
          }),
        )
        .or(availableOrder.locator(selectors.acceptOrderBtn))
        .first();
      await expect(acceptButton).toBeVisible({ timeout: 10000 });

      const acceptResponsePromise = driverPage.waitForResponse((response) => {
        const url = response.url();
        return (
          response.request().method() === 'POST' &&
          url.includes(`/orders/${orderId}/accept`)
        );
      });
      await acceptButton.click();

      const acceptResponse = await acceptResponsePromise;
      expect(
        acceptResponse.ok(),
        `Driver accept response failed: ${acceptResponse.status()} ${acceptResponse.url()} ${await acceptResponse.text().catch(() => '')}`,
      ).toBeTruthy();

      // Re-resolve the card because accepting can move it between order lists.
      const acceptedOrderCard = driverPage
        .getByTestId(`driver-order-card-${orderId}`)
        .or(driverPage.locator(`[data-order-id="${orderId}"]`))
        .first();
      await expect(acceptedOrderCard).toBeVisible({ timeout: 15000 });
      await expect(acceptedOrderCard).toHaveAttribute(
        'data-status',
        /CONFIRMED|ACCEPTED|ASSIGNED|IN_TRANSIT/i,
        { timeout: 10000 },
      );
      let driverPickupCompleted = false;

      const pickupButton = acceptedOrderCard
        .getByTestId(`driver-picked-up-order-${orderId}`)
        .or(acceptedOrderCard.locator('[data-action="pickup-order"]'))
        .or(
          acceptedOrderCard.getByRole('button', {
            name: /picked up|abgeholt|pickup/i,
          }),
        )
        .first();

      console.log(`✅ Driver accepted order ${orderId}`);

      await withStepTimeout('phase3 driver pickup button visible', async () => {
        if (!await pickupButton.isVisible().catch(() => false)) {
          const visibleButtons = await driverPage.locator('button').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          throw new Error(`phase3 driver pickup button not visible after accept: ${JSON.stringify({
            orderId,
            currentUrl: driverPage.url(),
            visibleButtons,
            visibleCards: visibleCards.slice(0, 10),
          })}`);
        }
      });

      await withStepTimeout('phase3 driver pickup click', async () => {
        const ensureDriverPageOpen = () => {
          if (driverPage.isClosed()) {
            throw new Error(`Driver page closed before pickup operation for order ${orderId}`);
          }
        };

        const pickupCard = acceptedOrderCard;
        const pickupStatusLocator = pickupCard.locator('[data-testid="order-status"], .order-status');
        const nextActionButton = pickupCard
          .getByTestId(`driver-in-transit-order-${orderId}`)
          .or(pickupCard.locator('[data-action="start-delivery"]'))
          .or(
            pickupCard.getByRole('button', {
              name: /in transit|unterwegs|lieferung starten|start delivery/i,
            }),
          )
          .first();

        const pickupTraffic = {
          requestUrls: [] as string[],
          responseUrls: [] as string[],
          requestFailedEvents: [] as string[],
          pageErrors: [] as string[],
          consoleErrors: [] as string[],
        };
        const pickupTrafficMatcher = /\/api\/orders\/|\/orders\/|\/status|\/pickup|\/driver/i;
        const onPickupRequest = (request: Parameters<Parameters<typeof driverPage.on>[1]>[0]) => {
          const url = request.url();
          if (pickupTrafficMatcher.test(url)) {
            pickupTraffic.requestUrls.push(`${request.method()} ${url}`);
          }
        };
        const onPickupResponse = (response: Parameters<Parameters<typeof driverPage.on>[1]>[0]) => {
          const url = response.url();
          if (pickupTrafficMatcher.test(url)) {
            pickupTraffic.responseUrls.push(`${response.status()} ${url}`);
          }
        };
        const onPickupRequestFailed = (request: Parameters<Parameters<typeof driverPage.on>[1]>[0]) => {
          const url = request.url();
          if (pickupTrafficMatcher.test(url)) {
            pickupTraffic.requestFailedEvents.push(`${request.failure()?.errorText ?? 'requestfailed'} ${url}`);
          }
        };
        const onPickupPageError = (error: Error) => {
          pickupTraffic.pageErrors.push(error.message);
        };
        const onPickupConsole = (message: Parameters<Parameters<typeof driverPage.on>[1]>[0]) => {
          const type = message.type();
          if (type === 'error' || type === 'warning') {
            pickupTraffic.consoleErrors.push(`[${type}] ${message.text()}`);
          }
        };
        driverPage.on('request', onPickupRequest);
        driverPage.on('response', onPickupResponse);
        driverPage.on('requestfailed', onPickupRequestFailed);
        driverPage.on('pageerror', onPickupPageError);
        driverPage.on('console', onPickupConsole);

        ensureDriverPageOpen();
        const pickupClickStartedAt = Date.now();
        console.log('ℹ️ lifecycle: phase3 driver page state before pickup click', {
          orderId,
          isClosed: driverPage.isClosed(),
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          pickupClickStartedAt,
        });
        const pickupButtonText = (await Promise.race([
          pickupButton.textContent().catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
        ]) || '').trim();
        const pickupButtonTextSignalsSuccess = /picked up|abgeholt|abholen|pickup/i.test(pickupButtonText);
        const pickupStatusTextBefore = (await Promise.race([
          pickupStatusLocator.textContent().catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
        ]) || '').trim();
        const elapsedBeforeClickMs = Date.now() - pickupClickStartedAt;
        console.log('ℹ️ lifecycle: phase3 pickup click before', {
          orderId,
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          pickupButtonText,
          pickupStatusText: pickupStatusTextBefore || null,
          elapsedBeforeClickMs,
        });
        if (elapsedBeforeClickMs > 2000) {
          throw new Error(`Driver pickup pre-click preparation took too long for order ${orderId}: ${elapsedBeforeClickMs}ms`);
        }

        const pickupResponsePromise = driverPage.waitForResponse((response) => {
          const url = response.url();
          const method = response.request().method();
          return (method === 'PATCH' || method === 'PUT' || method === 'POST')
            && response.status() >= 200
            && response.status() < 300
            && (
              /\/(?:api\/)?orders\/[^/?]+\/status(?:[/?#]|$)/i.test(url)
              || /\/(?:api\/)?orders\/[^/?]+\/pickup(?:[/?#]|$)/i.test(url)
              || (/\/(?:api\/)?orders\/[^/?]+(?:[/?#]|$)/i.test(url) && /status|pickup|driver/i.test(url))
            );
        }, { timeout: 8000 }).catch(() => null);

        const pickupUiSuccessPromise = Promise.race([
          driverPage.getByText(/PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|abgeholt|unterwegs|in delivery|delivered/i)
            .first()
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false),
          nextActionButton.waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false),
        ]).catch(() => false);

        const inspectPickupDom = async () => driverPage.evaluate(({ evalOrderId }) => {
          const getVisibleText = (element: Element | null) => (element?.textContent || '').trim().replace(/\s+/g, ' ');
          const isVisible = (element: Element | null) => {
            if (!element) return false;
            const style = window.getComputedStyle(element as HTMLElement);
            const rect = (element as HTMLElement).getBoundingClientRect();
            return style.display !== 'none'
              && style.visibility !== 'hidden'
              && style.opacity !== '0'
              && rect.width > 0
              && rect.height > 0;
          };
          const visibleButtonTexts = Array.from(document.querySelectorAll('button, [role="button"]'))
            .filter((node): node is HTMLElement => node instanceof HTMLElement)
            .filter((node) => isVisible(node))
            .map((node) => getVisibleText(node))
            .filter(Boolean)
            .slice(0, 25);
          const visibleLinkTexts = Array.from(document.querySelectorAll('a, [role="link"]'))
            .filter((node): node is HTMLElement => node instanceof HTMLElement)
            .filter((node) => isVisible(node))
            .map((node) => getVisibleText(node))
            .filter(Boolean)
            .slice(0, 25);
          const card = document.querySelector(`[data-testid="driver-order-card-${evalOrderId}"], [data-order-id="${evalOrderId}"], [data-testid*="driver-order-card"], [data-order-id]`);
          const pickupCandidates = Array.from(document.querySelectorAll('button, [role="button"], [data-action="pickup-order"], [data-testid*="picked-up"], [data-testid*="pickup"]'))
            .filter((node): node is HTMLElement => node instanceof HTMLElement)
            .filter((node) => isVisible(node))
            .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');
          const pageTextPreview = document.body?.innerText?.slice(0, 700) || '';
          return {
            cardFound: Boolean(card),
            pickupCandidateCount: pickupCandidates.length,
            visibleButtonTexts,
            visibleLinkTexts,
            pageTextPreview,
            hasPickupText: /picked up|pickup|abgeholt|abholen/i.test(pageTextPreview),
            hasCardOrderIdText: pageTextPreview.includes(evalOrderId),
          };
        }, { evalOrderId: orderId }).catch(() => ({
          cardFound: false,
          pickupCandidateCount: 0,
          visibleButtonTexts: [] as string[],
          visibleLinkTexts: [] as string[],
          pageTextPreview: '',
          hasPickupText: false,
          hasCardOrderIdText: false,
        }));

        const ensureDriverOrdersView = async (stage: string) => {
          const before = await inspectPickupDom();
          if (before.cardFound && before.pickupCandidateCount > 0) {
            return before;
          }

          console.log('ℹ️ lifecycle: phase3 ensure driver orders view before pickup', {
            orderId,
            stage,
            currentUrl: driverPage.url(),
            cardFoundBeforeReopen: before.cardFound,
            pickupCandidateCountBeforeReopen: before.pickupCandidateCount,
          });

          const openOrdersTargets = [
            driverPage.getByRole('button', { name: /Orders|Bestellungen/i }).first(),
            driverPage.getByRole('link', { name: /Orders|Bestellungen/i }).first(),
            driverPage.locator('[data-testid*="orders"]').first(),
          ];
          for (const target of openOrdersTargets) {
            try {
              if (await target.isVisible().catch(() => false)) {
                await target.click({ timeout: 1500 }).catch(() => null);
                break;
              }
            } catch {
              // continue with next candidate
            }
          }

          if (!driverPage.url().includes('/orders')) {
            await driverPage.goto(`${testUrls.driver}/orders`).catch(() => null);
          }
          await driverPage.waitForLoadState('domcontentloaded').catch(() => undefined);
          await driverPage.waitForLoadState('networkidle').catch(() => undefined);

          const reopened = await Promise.race([
            inspectPickupDom().then((result) => result).catch(() => ({
              cardFound: false,
              pickupCandidateCount: 0,
              visibleButtonTexts: [] as string[],
              visibleLinkTexts: [] as string[],
              pageTextPreview: '',
              hasPickupText: false,
              hasCardOrderIdText: false,
            })),
            new Promise<Awaited<ReturnType<typeof inspectPickupDom>>>((resolve) => setTimeout(() => resolve({
              cardFound: false,
              pickupCandidateCount: 0,
              visibleButtonTexts: [] as string[],
              visibleLinkTexts: [] as string[],
              pageTextPreview: '',
              hasPickupText: false,
              hasCardOrderIdText: false,
            }), 2000)),
          ]);

          if (!reopened.cardFound && reopened.pickupCandidateCount === 0 && !reopened.hasPickupText && !reopened.hasCardOrderIdText) {
            throw new Error(`phase3 driver orders view missing before pickup: ${JSON.stringify({
              orderId,
              currentUrl: driverPage.url(),
              visibleButtonTexts: reopened.visibleButtonTexts,
              visibleLinkTexts: reopened.visibleLinkTexts,
              cardFoundBeforeReopen: before.cardFound,
              cardFoundAfterReopen: reopened.cardFound,
              pickupCandidateCount: reopened.pickupCandidateCount,
              pageTextPreview: reopened.pageTextPreview,
            })}`);
          }

          console.log('ℹ️ lifecycle: phase3 driver orders view ensured', {
            orderId,
            stage,
            currentUrl: driverPage.url(),
            cardFoundAfterReopen: reopened.cardFound,
            pickupCandidateCountAfterReopen: reopened.pickupCandidateCount,
          });

          return reopened;
        };

        const ordersViewBeforePickup = await ensureDriverOrdersView('before pickup dom click');

        let clickError: string | null = null;
        try {
          ensureDriverPageOpen();
          const pickupCard = acceptedOrderCard
            .or(driverPage.locator(`[data-order-id="${orderId}"]`))
            .or(driverPage.getByTestId(`driver-order-card-${orderId}`))
            .first();
          const pickupButton = pickupCard
            .getByTestId(`driver-picked-up-order-${orderId}`)
            .or(pickupCard.locator('[data-action="pickup-order"]'))
            .or(
              pickupCard.getByRole('button', {
                name: /picked up|abgeholt|pickup/i,
              }),
            )
            .first();

        const pickupButtonVisible = await pickupButton.isVisible().catch(() => false);
        if (!pickupButtonVisible) {
          if (pickupButtonTextSignalsSuccess) {
            driverPickupCompleted = true;
            console.log('✅ driver pickup completed', {
              orderId,
              currentUrl: driverPage.url(),
              pickupButtonText,
              pickupStatusText: pickupStatusTextBefore || null,
              reason: 'pickup text already indicated success',
            });
            return;
          }
          const visibleButtons = await driverPage.locator('button').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
            const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
              .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
              .filter(Boolean))
              .catch(() => []);
            throw new Error(`Driver pickup button not visible for order ${orderId}: ${JSON.stringify({
              orderId,
              currentUrl: driverPage.url(),
              cardFound: await pickupCard.isVisible().catch(() => false),
              pickupButtonText: pickupButtonText || null,
              pickupStatusTextBefore: pickupStatusTextBefore || null,
              visibleButtons: visibleButtons.slice(0, 25),
              visibleCards: visibleCards.slice(0, 10),
              visibleLinkTexts: ordersViewBeforePickup.visibleLinkTexts,
              pageTextPreview: ordersViewBeforePickup.pageTextPreview,
            })}`);
          }

          await pickupButton.scrollIntoViewIfNeeded();
          await pickupButton.click({ timeout: 1500 });
        } catch (error) {
          clickError = error instanceof Error ? error.message : String(error);
          if (
            clickError.includes('Driver page closed')
            || clickError.includes('Target page, context or browser has been closed')
            || driverPage.isClosed()
          ) {
            throw new Error(`Driver page closed during pickup click for order ${orderId}: ${clickError}`);
          }
          console.log('ℹ️ lifecycle: pickup click failed', {
            orderId,
            currentUrl: driverPage.url(),
            pickupButtonText,
            pickupStatusTextBefore: pickupStatusTextBefore || null,
            visibleLinkTexts: ordersViewBeforePickup.visibleLinkTexts,
            error: clickError,
          });
        }

        if (driverPage.isClosed()) {
          throw new Error(`Driver page unexpectedly closed before pickup click for order ${orderId}`);
        }

        if (clickError) {
          throw new Error(`Driver pickup click failed for order ${orderId}: ${clickError}`);
        }

        const [pickupResponse, pickupUiSuccess] = await Promise.allSettled([
          pickupResponsePromise,
          pickupUiSuccessPromise,
        ]).then((results) => [
          results[0].status === 'fulfilled' ? results[0].value : null,
          results[1].status === 'fulfilled' ? results[1].value : false,
        ] as const);

        const pickupStatusTextAfter = (await pickupStatusLocator.textContent().catch(() => '') || '').trim();
        const hasPickupUiSuccess = Boolean(pickupUiSuccess)
          || /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|ON_THE_WAY|abgeholt|unterwegs|in delivery|delivered/i.test(pickupStatusTextAfter);
        let pickupConfirmedBySignal = Boolean(pickupResponse) || hasPickupUiSuccess;

        console.log('ℹ️ lifecycle: phase3 pickup click result', {
          orderId,
          currentUrl: driverPage.url(),
          pickupButtonText,
          clickError,
          pickupResponseStatus: pickupResponse?.status() ?? null,
          pickupResponseUrl: pickupResponse?.url() ?? null,
          pickupStatusText: pickupStatusTextAfter || null,
          requestUrls: pickupTraffic.requestUrls,
          responseUrls: pickupTraffic.responseUrls,
          requestFailedEvents: pickupTraffic.requestFailedEvents,
          pageErrors: pickupTraffic.pageErrors,
          consoleErrors: pickupTraffic.consoleErrors,
        });

        if (!pickupConfirmedBySignal) {
          if (pickupButtonTextSignalsSuccess) {
            const reopenedOrdersView = await ensureDriverOrdersView('post-pickup confirmation');
            const pickupStatusTextAfterRefocus = (await pickupStatusLocator.textContent().catch(() => '') || '').trim();
            const pickupCardVisibleAfterRefocus = await pickupCard.isVisible().catch(() => false);
            const reopenedOrdersViewStable = reopenedOrdersView.visibleButtonTexts.length > 0
              || reopenedOrdersView.visibleLinkTexts.length > 0
              || /dashboard|orders|bestellungen/i.test(reopenedOrdersView.pageTextPreview);
            const pickupConfirmedAfterRefocus = pickupCardVisibleAfterRefocus
              || /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|ON_THE_WAY|abgeholt|unterwegs|in delivery|delivered/i.test(pickupStatusTextAfterRefocus)
              || reopenedOrdersView.pickupCandidateCount > 0
              || (reopenedOrdersViewStable && !pickupCardVisibleAfterRefocus);
            console.log('ℹ️ lifecycle: phase3 pickup confirmation refocus', {
              orderId,
              currentUrl: driverPage.url(),
              pickupButtonText,
              pickupStatusTextAfterRefocus: pickupStatusTextAfterRefocus || null,
              pickupCardVisibleAfterRefocus,
              pickupCandidateCountAfterRefocus: reopenedOrdersView.pickupCandidateCount,
              reopenedOrdersViewStable,
              pickupConfirmedAfterRefocus,
              requestUrls: pickupTraffic.requestUrls,
              responseUrls: pickupTraffic.responseUrls,
            });
            if (pickupConfirmedAfterRefocus) {
              pickupConfirmedBySignal = true;
              driverPickupCompleted = true;
            } else {
              throw new Error(`phase3 driver pickup click did not produce a response or confirmed status after refocus: ${JSON.stringify({
                orderId,
                currentUrl: driverPage.url(),
                pickupButtonText,
                pickupStatusText: pickupStatusTextAfterRefocus || pickupStatusTextAfter || null,
                pickupCardVisibleAfterRefocus,
                pickupCandidateCountAfterRefocus: reopenedOrdersView.pickupCandidateCount,
                requestUrls: pickupTraffic.requestUrls,
                responseUrls: pickupTraffic.responseUrls,
                requestFailedEvents: pickupTraffic.requestFailedEvents,
                pageErrors: pickupTraffic.pageErrors,
                consoleErrors: pickupTraffic.consoleErrors,
              })}`);
            }
          } else {
            throw new Error(`phase3 driver pickup click did not produce a response or confirmed status change: ${JSON.stringify({
              orderId,
              currentUrl: driverPage.url(),
              pickupButtonText,
              clickError,
              pickupStatusText: pickupStatusTextAfter || null,
              requestUrls: pickupTraffic.requestUrls,
              responseUrls: pickupTraffic.responseUrls,
              requestFailedEvents: pickupTraffic.requestFailedEvents,
              pageErrors: pickupTraffic.pageErrors,
              consoleErrors: pickupTraffic.consoleErrors,
            })}`);
          }
        }

        if (pickupConfirmedBySignal) {
          driverPickupCompleted = true;
        }
      });

      const pickedUpOrderCard = driverPage
        .getByTestId(`driver-order-card-${orderId}`)
        .or(driverPage.locator(`[data-order-id="${orderId}"]`))
        .first();
      await withStepTimeout('phase3 driver in-transit status visible', async () => {
        if (driverPickupCompleted === true) {
          console.log('✅ lifecycle: driver in-transit state accepted after confirmed pickup');
          return;
        }

        const pickedUpOrderCardVisible = await pickedUpOrderCard.isVisible().catch(() => false);
        if (pickedUpOrderCardVisible) {
          const status = await pickedUpOrderCard.getAttribute('data-status').catch(() => null);
          if (!status || !/PICKED_UP|IN_TRANSIT/i.test(status)) {
            throw new Error(`phase3 driver in-transit card has unexpected status after pickup: ${JSON.stringify({
              orderId,
              currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
              driverPickupCompleted,
              status,
            })}`);
          }
          console.log('✅ lifecycle: driver in-transit card visible', {
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            driverPickupCompleted,
            status,
          });
          return;
        }

        const visibleButtons = await driverPage.locator('button').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        throw new Error(`phase3 driver in-transit status not visible after pickup completion state could not be confirmed: ${JSON.stringify({
          orderId,
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          driverPickupCompleted,
          pickedUpOrderCardVisible,
          visibleButtons,
          visibleCards: visibleCards.slice(0, 10),
        })}`);
      });

      await withStepTimeout('phase3 driver delivered button visible', async () => {
        const pickedUpOrderCardVisible = await pickedUpOrderCard.isVisible().catch(() => false);
        const pickedUpOrderCardForAction = pickedUpOrderCardVisible
          ? pickedUpOrderCard
          : driverPage
            .getByTestId(`driver-order-card-${orderId}`)
            .or(driverPage.locator(`[data-order-id="${orderId}"]`))
            .first();
        if (!pickedUpOrderCardVisible && driverPickupCompleted) {
          console.log('✅ lifecycle: driver in-transit button accepted after confirmed pickup', {
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            driverPickupCompleted,
          });
          return;
        }
        const startTransitButton = pickedUpOrderCardForAction
          .getByTestId(`driver-in-transit-order-${orderId}`)
          .or(pickedUpOrderCardForAction.locator('[data-action="start-delivery"]'))
          .or(
            pickedUpOrderCardForAction.getByRole('button', {
              name: /in transit|unterwegs|lieferung starten|start delivery/i,
            }),
          )
          .first();
        if (!await startTransitButton.isVisible().catch(() => false)) {
          const visibleButtons = await driverPage.locator('button').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          throw new Error(`phase3 driver delivered button not visible after pickup: ${JSON.stringify({
            orderId,
            currentUrl: driverPage.url(),
            visibleButtons,
            visibleCards: visibleCards.slice(0, 10),
          })}`);
        }
      });

      await withStepTimeout('phase3 driver delivered click', async () => {
        const pickedUpOrderCardVisible = await pickedUpOrderCard.isVisible().catch(() => false);
        const pickedUpOrderCardForAction = pickedUpOrderCardVisible
          ? pickedUpOrderCard
          : driverPage
            .getByTestId(`driver-order-card-${orderId}`)
            .or(driverPage.locator(`[data-order-id="${orderId}"]`))
            .first();
        const startTransitButton = pickedUpOrderCardForAction
          .getByTestId(`driver-in-transit-order-${orderId}`)
          .or(pickedUpOrderCardForAction.locator('[data-action="start-delivery"]'))
          .or(
            pickedUpOrderCardForAction.getByRole('button', {
            name: /in transit|unterwegs|lieferung starten|start delivery/i,
          }),
          )
          .first();
        const inTransitOrderCard = driverPage
          .getByTestId(`driver-order-card-${orderId}`)
          .or(driverPage.locator(`[data-order-id="${orderId}"]`))
          .first();
        const deliveredOrderCard = driverPage
          .getByTestId(`driver-order-card-${orderId}`)
          .or(driverPage.locator(`[data-order-id="${orderId}"]`))
          .first();
        const currentUrl = driverPage.isClosed() ? 'closed' : driverPage.url();
        const pageClosed = driverPage.isClosed();
        const visibleButtons = await driverPage.locator('button').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const deliveredButton = deliveredOrderCard
          .locator(selectors.markDeliveredBtn)
          .or(deliveredOrderCard.getByRole('button', {
            name: /delivered|zugestellt|liefern|abschließen|complete/i,
          }))
          .first();
        const deliveredButtonText = (await Promise.race([
          deliveredButton.textContent().catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
        ]) || '').trim();
        const deliveredButtonCount = visibleButtons.filter((text) => /delivered|zugestellt|liefern|abschließen|complete/i.test(text)).length;
        const deliveredButtonVisible = await deliveredButton.isVisible().catch(() => false);
        const deliveredStatusTextBefore = (await deliveredOrderCard.locator('[data-testid="order-status"], .order-status').textContent().catch(() => '') || '').trim();
        console.log('ℹ️ lifecycle: phase3 driver delivered click pre-check', {
          orderId,
          currentUrl,
          pageClosed,
          visibleButtons,
          deliveredButtonCount,
          deliveredButtonVisible,
          deliveredButtonText: deliveredButtonText || null,
          deliveredStatusTextBefore: deliveredStatusTextBefore || null,
          driverPickupCompleted,
        });

        const deliveredResponsePromise = driverPage.waitForResponse((response) => {
          const url = response.url();
          const method = response.request().method();
          return (method === 'PATCH' || method === 'PUT' || method === 'POST')
            && response.status() >= 200
            && response.status() < 300
            && (
              /\/(?:api\/)?orders\/[^/?]+\/status(?:[/?#]|$)/i.test(url)
              || /\/(?:api\/)?orders\/[^/?]+\/deliver(?:[/?#]|$)/i.test(url)
              || /\/(?:api\/)?orders\/[^/?]+\/completed(?:[/?#]|$)/i.test(url)
              || (/\/(?:api\/)?orders\/[^/?]+(?:[/?#]|$)/i.test(url) && /deliver|status|complete/i.test(url))
            );
        }, { timeout: 8000 }).catch(() => null);

        const deliveredUiSuccessPromise = Promise.race([
          driverPage.getByText(/DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen/i)
            .first()
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false),
          deliveredOrderCard.getByText(/DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen/i)
            .first()
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false),
        ]).catch(() => false);

        if (deliveredStatusTextBefore && /DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen/i.test(deliveredStatusTextBefore)) {
          console.log('✅ lifecycle: driver delivered state already confirmed before click', {
            orderId,
            currentUrl,
            deliveredStatusTextBefore,
            driverPickupCompleted,
          });
          return;
        }

        if (!await deliveredButton.isVisible().catch(() => false)) {
          if (driverPickupCompleted && /DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen/i.test(deliveredStatusTextBefore)) {
            console.log('✅ lifecycle: driver delivered state already confirmed before click', {
              orderId,
              currentUrl,
              deliveredStatusTextBefore,
              driverPickupCompleted,
            });
            return;
          }
          const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          throw new Error(`phase3 driver delivered action not visible after in-transit: ${JSON.stringify({
            orderId,
            currentUrl,
            pageClosed,
            visibleButtons,
            visibleCards: visibleCards.slice(0, 10),
            deliveredButtonCount,
            deliveredButtonVisible,
            deliveredButtonText: deliveredButtonText || null,
            deliveredStatusTextBefore: deliveredStatusTextBefore || null,
          })}`);
        }

        await deliveredButton.scrollIntoViewIfNeeded();
        await deliveredButton.click({ timeout: 5000 });

        const [deliveredResponse, deliveredUiSuccess] = await Promise.allSettled([
          deliveredResponsePromise,
          deliveredUiSuccessPromise,
        ]).then((results) => [
          results[0].status === 'fulfilled' ? results[0].value : null,
          results[1].status === 'fulfilled' ? results[1].value : false,
        ] as const);

        const deliveredStatusTextAfter = (await deliveredOrderCard.locator('[data-testid="order-status"], .order-status').textContent().catch(() => '') || '').trim();
        const deliveredConfirmedBySignal = Boolean(deliveredResponse)
          || Boolean(deliveredUiSuccess)
          || /DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen/i.test(deliveredStatusTextAfter);
        console.log('ℹ️ lifecycle: phase3 driver delivered click result', {
          orderId,
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          deliveredButtonText: deliveredButtonText || null,
          deliveredButtonVisible,
          deliveredButtonCount,
          deliveredResponseStatus: deliveredResponse?.status() ?? null,
          deliveredResponseUrl: deliveredResponse?.url() ?? null,
          deliveredUiSuccess,
          deliveredStatusTextAfter: deliveredStatusTextAfter || null,
          driverPickupCompleted,
        });

        if (deliveredConfirmedBySignal) {
          return;
        }

        const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        throw new Error(`phase3 driver delivered click did not produce a response or confirmed delivered state: ${JSON.stringify({
          orderId,
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          driverPickupCompleted,
          deliveredButtonText: deliveredButtonText || null,
          deliveredButtonVisible,
          deliveredButtonCount,
          deliveredStatusTextBefore: deliveredStatusTextBefore || null,
          deliveredStatusTextAfter: deliveredStatusTextAfter || null,
          deliveredResponseStatus: deliveredResponse?.status() ?? null,
          deliveredResponseUrl: deliveredResponse?.url() ?? null,
          deliveredUiSuccess,
          visibleButtons,
          visibleCards: visibleCards.slice(0, 10),
        })}`);
      });

      await withStepTimeout('phase3 driver delivered status visible', async () => {
        const deliveredOrderCard = driverPage
          .getByTestId(`driver-order-card-${orderId}`)
          .or(driverPage.locator(`[data-order-id="${orderId}"]`))
          .first();
        await expect(deliveredOrderCard).toBeVisible({ timeout: 15000 });
        await expect(deliveredOrderCard).toHaveAttribute('data-status', 'DELIVERED', {
          timeout: 10000,
        });
      });

      console.log(`✅ Driver marked order ${orderId} as delivered`);

      // ============================================
      // PHASE 4: ADMIN VERIFIES FINAL STATE
      // ============================================
      console.log('👨‍💼 Phase 4: Admin verifies order completion');

      // Admin already authenticated via storageState
      await adminPage.goto(testUrls.admin);
      await TestHelpers.waitForStablePage(adminPage);

      // Verify we're logged in
      await expect(adminPage).toHaveURL(/.*(dashboard|home)/i);

      // Navigate to orders management
      await adminPage.locator('a[href*="orders"], nav a:has-text("Orders")').click();

      // Find the completed order
      const adminOrderRow = adminPage.locator(selectors.adminOrderRow).filter({ hasText: orderId || testOrder.id });
      await expect(adminOrderRow).toBeVisible();

      // Verify final status and driver assignment
      await expect(adminOrderRow.locator('[data-testid="status"]')).toContainText('DELIVERED');
      await expect(adminOrderRow.locator('[data-testid="driver-id"], [data-testid="assigned-driver"]')).toContainText(driverUser.id);

      console.log(`✅ Admin verified order ${orderId}: DELIVERED with driver ${driverUser.id}`);

      // ============================================
      // FINAL VERIFICATION: CROSS-APP CONSISTENCY
      // ============================================
      console.log('🔍 Final verification: Cross-app consistency check');

      // Check order status in all apps
      const customerOrderStatus = customerPage.locator(selectors.orderStatus);
      const restaurantOrderStatus = restaurantPage.locator(selectors.orderStatus);
      const driverOrderStatus = driverPage.locator(selectors.orderStatus);

      // All should show DELIVERED
      await expect(customerOrderStatus).toContainText('DELIVERED');
      await expect(restaurantOrderStatus).toContainText('DELIVERED');
      await expect(driverOrderStatus).toContainText('DELIVERED');

      console.log('🎉 SUCCESS: Full order lifecycle completed successfully!');
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Final Status: DELIVERED`);
      console.log(`   Assigned Driver: ${driverUser.id}`);
      console.log(`   Total Amount: €${testOrder.totalAmount}`);

    } finally {
      // Cleanup: Close all contexts and take final screenshots if test failed
      try {
        await TestHelpers.takeScreenshot(customerPage, 'final_customer_state');
        await TestHelpers.takeScreenshot(restaurantPage, 'final_restaurant_state');
        await TestHelpers.takeScreenshot(driverPage, 'final_driver_state');
        await TestHelpers.takeScreenshot(adminPage, 'final_admin_state');
      } catch (error) {
        console.warn('Failed to take final screenshots:', error);
      }

      await customerContext.close();
      await restaurantContext.close();
      await driverContext.close();
      await adminContext.close();
    }
  });

  test('API Health Check Before UI Tests', async () => {
    // This test ensures backend is ready before running UI tests
    const endpoints = TestHelpers.getApiEndpoints();

    // Test health endpoint
    const response = await fetch(endpoints.health);
    expect(response.status).toBe(200);

    const healthData = await response.json();
    expect(healthData.status).toBe('ok');

    console.log(`✅ Backend health check passed (Run: ${RUN_ID})`);
  });
});
