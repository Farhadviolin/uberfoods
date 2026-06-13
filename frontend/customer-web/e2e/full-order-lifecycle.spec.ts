import { expect, type Locator, type Page } from '@playwright/test';
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

test.describe('Full Order Lifecycle UI-E2E', () => {
  let orderId: string;
  let customerCredentials = createLifecycleCustomerCredentials();
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

  test.setTimeout(300000); // 5 minutes for full lifecycle across four apps

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

        const minimumWarningVisible = async () => (await minOrderSummary.isVisible().catch(() => false))
          && (await getMissingMinOrderAmount()) > 0;

        for (let attempt = 1; attempt <= 10; attempt += 1) {
          const missingAmount = await getMissingMinOrderAmount();

          if (!missingAmount || Number.isNaN(missingAmount)) {
            console.log(`✅ lifecycle: minimum order satisfied after ${attempt - 1} extra attempts`);
            console.log('✅ lifecycle: leaving phase1 minimum order satisfaction');
            return;
          }

          console.log(`➡️ lifecycle: minimum order still open (${missingAmount.toFixed(2)}€ missing), adding item attempt ${attempt}`);
          const count = await addToCartButtons.count();
          expect(count).toBeGreaterThan(0);
          await addToCartButtons.nth((attempt - 1) % count).click();
          await customerPage.waitForTimeout(300);

          if (!(await minimumWarningVisible())) {
            console.log(`✅ lifecycle: minimum order satisfied after ${attempt} extra attempts`);
            console.log('✅ lifecycle: leaving phase1 minimum order satisfaction');
            return;
          }
        }

        throw new Error('Minimum order value was not satisfied after 10 add-to-cart attempts');
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

        const ensureProfileAddress = async () => {
          const profileAddressSignals = await collectProfileAddressSignals();

          console.log('➡️ lifecycle: checking profile address before final submit', {
            currentUrl: customerPage.url(),
            ...profileAddressSignals,
          });

          if (!profileAddressSignals.missingAddressDetected && !profileAddressSignals.locatorVisible) {
            console.log('ℹ️ lifecycle: profile address warning not visible, continuing with final submit');
            return false;
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
            return request.method() === 'PUT' && new URL(response.url()).pathname.includes('/customers/');
          }, { timeout: 20000 });

          await saveButton.click();
          const profileSaveResponse = await profileSaveResponsePromise.catch(() => null);
          if (!profileSaveResponse) {
            throw new Error('Profile address save did not produce a response before checkout retry');
          }

          console.log('✅ lifecycle: profile save response received', {
            status: profileSaveResponse.status(),
            url: profileSaveResponse.url(),
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
          await customerPage.goto('/checkout', { waitUntil: 'domcontentloaded' });
          await customerPage.waitForLoadState('networkidle').catch(() => null);
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
          console.log('ℹ️ lifecycle: checkout address state after profile update', {
            checkoutStoredUserAddress,
            checkoutWarningTextsAfterProfileUpdate,
            checkoutAddressTextsAfterProfileUpdate,
          });
          if (!checkoutWarningTextsAfterProfileUpdate.length && !checkoutAddressTextsAfterProfileUpdate.length) {
            console.log('✅ lifecycle: checkout address warning cleared after profile update');
          }
          console.log('✅ lifecycle: returned to checkout after profile update');
          return true;
        };

        await logCheckoutDiagnostics('before final submit');
        await ensureProfileAddress();
        await logCheckoutDiagnostics('after profile verification');

        const orderCreateResponsePromise = customerPage.waitForResponse((response) => {
          const request = response.request();
          return request.method() === 'POST'
            && new URL(response.url()).pathname === '/api/orders/customer';
        }, { timeout: 20000 });
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

        await customerPage.evaluate(() => {
          const probe = {
            clickSeen: false,
            submitSeen: false,
            submitTarget: null as string | null,
            clickedText: null as string | null,
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

        finalPlaceOrderButton = customerPage
          .getByTestId('cart')
          .locator('button[data-testid="checkout-button"]')
          .filter({ hasText: /^(Place Order|Bestellen|Submit Order|Order Now|Jetzt bestellen|Zahlungspflichtig bestellen|Bezahlen|Pay)$/i })
          .first();

        await expect(finalPlaceOrderButton).toBeVisible();
        console.log('✅ lifecycle: phase1 final Place Order button visible');
        await expect(finalPlaceOrderButton).toBeEnabled();
        console.log('✅ lifecycle: phase1 final Place Order button enabled');
        console.log('➡️ lifecycle: phase1 clicking final Place Order');

        await finalPlaceOrderButton.scrollIntoViewIfNeeded().catch(() => null);
        await finalPlaceOrderButton.click({ noWaitAfter: true });
        console.log('✅ lifecycle: phase1 final Place Order click completed');

        const paymentModal = customerPage.getByTestId('payment-modal');
        const orderTrackingPage = customerPage.getByTestId('order-tracking-page');
        const performFinalSubmitAttempt = async (attemptLabel: string) => {
          const attemptOutcome = await Promise.race([
            orderCreateResponsePromise.then((response) => ({ kind: 'response' as const, response })).catch(() => null),
            paymentModal.waitFor({ state: 'visible', timeout: 20000 }).then(() => ({ kind: 'payment-modal' as const })).catch(() => null),
            customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 20000 }).then(() => ({ kind: 'order-url' as const })).catch(() => null),
            orderTrackingPage.waitFor({ state: 'visible', timeout: 20000 }).then(() => ({ kind: 'order-tracking' as const })).catch(() => null),
          ]);

          if (attemptOutcome) {
            return attemptOutcome;
          }

          const submitProbe = await customerPage.evaluate(() => (window as unknown as { __checkoutSubmitProbe?: unknown }).__checkoutSubmitProbe ?? null);
          const visibleTotalText = await cartContainer.locator('text=/€|Mindestbestellwert|Total|Gesamt/i').allTextContents().catch(() => []);
          const visibleAddressText = await customerPage.locator('text=/address|adresse|liefer|delivery|street|straße/i').allTextContents().catch(() => []);
          const visiblePhoneText = await customerPage.locator('text=/phone|telefon|mobile|handy/i').allTextContents().catch(() => []);
          const visiblePaymentText = await customerPage.locator('text=/payment|card|karte|pay|zahlung/i').allTextContents().catch(() => []);
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
          });
          return null;
        };

        let orderSubmissionOutcome = await performFinalSubmitAttempt('initial');

        if (!orderSubmissionOutcome) {
          const retryProbe = await customerPage.evaluate(() => (window as unknown as { __checkoutSubmitProbe?: unknown }).__checkoutSubmitProbe ?? null);
          const retryGuard = typeof retryProbe === 'object' && retryProbe
            ? (retryProbe as { guard?: string | null }).guard
            : null;

          if (retryGuard === 'missing-user-address') {
            console.log('ℹ️ lifecycle: missing-user-address recovery triggered', {
              retryGuard,
            });
            await ensureProfileAddress();
            orderSubmissionOutcome = await performFinalSubmitAttempt('retry after missing-user-address recovery');
          }
        }

        if (!orderSubmissionOutcome) {
          throw new Error('Final order submission did not produce a response or confirmation UI');
        }

        if (orderSubmissionOutcome.kind === 'response') {
          const orderCreateResponse = orderSubmissionOutcome.response;
          console.log(`✅ lifecycle: phase1 order response received (${orderCreateResponse.status()})`);
          const createdOrder = await orderCreateResponse.json().catch(() => ({}));
          orderId = createdOrder.id || orderId;
          if (!orderId) {
            throw new Error('Order creation response did not include an id');
          }
          console.log(`✅ lifecycle: phase1 order id resolved (${orderId})`);
        } else {
          console.log(`ℹ️ lifecycle: phase1 final order submit confirmed by ${orderSubmissionOutcome.kind}`);
        }
      });

      // Complete payment in the modal if the UI shows one, otherwise accept
      // the direct navigation flow after the order is created.
      await Promise.race([
        paymentModal.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
        customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 15000 }).catch(() => null),
      ]);

      if (await paymentModal.isVisible().catch(() => false)) {
        const cardForm = customerPage.locator('.card-form');
        if (await cardForm.isVisible()) {
          await customerPage.getByLabel(/karteninhaber/i).fill(testOrder.customer.name);
          await customerPage.getByLabel(/kartennummer/i).fill('4242 4242 4242 4242');
          await customerPage.getByLabel(/gültig bis/i).fill('12/34');
          await customerPage.getByLabel(/cvc/i).fill('123');
        }

        const paymentConfirmButton = customerPage.getByTestId('payment-confirm-button');
        await expect(paymentConfirmButton).toBeVisible();
        await paymentConfirmButton.click();
      } else {
        console.log('ℹ️ Payment modal not shown, waiting for direct order navigation');
      }

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
        console.log(`📦 Order created: ${orderId}`);
      }

      // ============================================
      // PHASE 2: RESTAURANT SETS READY FOR PICKUP
      // ============================================
      console.log('🍽️  Phase 2: Restaurant sets order ready for pickup');

      // Restaurant already authenticated via storageState
      await restaurantPage.goto(testUrls.restaurant);
      await TestHelpers.waitForStablePage(restaurantPage);

      // Verify we're logged in
      await expect(restaurantPage).toHaveURL(/.*(dashboard|home)/i);

      // Navigate to orders
      await restaurantPage.locator(selectors.navOrders).click();

      // Find the order and mark as ready
      const orderCard = restaurantPage.locator(selectors.orderCard).filter({ hasText: orderId || testOrder.id });
      await expect(orderCard).toBeVisible();

      const readyBtn = orderCard.locator(selectors.readyForPickupBtn);
      await readyBtn.click();

      // Verify status changed
      await expect(orderCard.locator(selectors.orderStatus)).toContainText('READY_FOR_PICKUP');

      console.log(`✅ Restaurant marked order ${orderId} as ready for pickup`);

      // ============================================
      // PHASE 3: DRIVER ACCEPTS AND DELIVERS ORDER
      // ============================================
      console.log('🚚 Phase 3: Driver accepts and delivers order');

      // Driver already authenticated via storageState
      await driverPage.goto(testUrls.driver);
      await TestHelpers.waitForStablePage(driverPage);

      // Verify we're logged in
      await expect(driverPage).toHaveURL(/.*(dashboard|home)/i);

      // Navigate to available orders
      await driverPage.locator('a[href*="orders"], nav a:has-text("Orders")').click();

      // Find available order
      const availableOrder = driverPage.locator(selectors.orderCard).first();
      await expect(availableOrder).toBeVisible();

      // Accept order
      await availableOrder.locator(selectors.acceptOrderBtn).click();

      // Verify accepted status
      await expect(availableOrder.locator(selectors.orderStatus)).toContainText('IN_TRANSIT');

      console.log(`✅ Driver accepted order ${orderId}`);

      // Mark as delivered
      await availableOrder.locator(selectors.markDeliveredBtn).click();

      // Verify delivered status
      await expect(availableOrder.locator(selectors.orderStatus)).toContainText('DELIVERED');

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
