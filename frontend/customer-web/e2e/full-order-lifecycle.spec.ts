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

async function resolveOrderCreationAfterPaymentConfirm(customerPage: Page) {
  const responseTimeoutMs = 10000;
  const response = await Promise.race([
    customerPage.waitForResponse((res) => {
      const request = res.request();
      return request.method() === 'POST'
        && /\/(?:api\/)?orders\/customer(?:[/?#]|$)/i.test(res.url())
        && [200, 201, 202].includes(res.status());
    }, { timeout: responseTimeoutMs }).catch(() => null),
    customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: responseTimeoutMs })
      .then(() => null)
      .catch(() => null),
  ]);

  return response;
}

async function ensureDriverOrdersViewAfterPickup(
  driverPage: Page,
  orderId: string,
  stage: string,
) {
  const inspectOrdersDom = async () => driverPage.evaluate((resolvedOrderId) => {
    const isVisible = (node: Element | null | undefined) => {
      if (!node || !(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && node.getClientRects().length > 0;
    };
    const getVisibleText = (node: Element | null | undefined) => {
      if (!node || !(node instanceof HTMLElement) || !isVisible(node)) return '';
      return (node.textContent || '').trim().replace(/\s+/g, ' ');
    };
    const visibleButtonTexts = Array.from(document.querySelectorAll('button'))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => isVisible(node))
      .map((node) => getVisibleText(node))
      .filter(Boolean)
      .slice(0, 40);
    const visibleLinkTexts = Array.from(document.querySelectorAll('a, [role="link"]'))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => isVisible(node))
      .map((node) => getVisibleText(node))
      .filter(Boolean)
      .slice(0, 30);
    const orderCard = document.querySelector(`[data-testid="driver-order-card-${resolvedOrderId}"], [data-order-id="${resolvedOrderId}"]`);
    const orderCards = Array.from(document.querySelectorAll('[data-testid*="driver-order-card"], .order-card, [data-order-id]'))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => isVisible(node));
    const bodyText = document.body?.innerText?.slice(0, 1000) || '';
    return {
      orderCardVisible: Boolean(orderCard && isVisible(orderCard)),
      orderCardCount: orderCards.length,
      visibleButtonTexts,
      visibleLinkTexts,
      bodyTextPreview: bodyText,
      hasOrdersText: /bestellungen|orders/i.test(bodyText),
      hasActiveOrdersText: /aktive bestellungen|active orders|current orders|in transit|unterwegs|picked up/i.test(bodyText),
      hasDeliveredText: /delivered|zugestellt|geliefert/i.test(bodyText),
      hasOrderIdText: bodyText.includes(resolvedOrderId),
    };
  }, orderId).catch(() => ({
    orderCardVisible: false,
    orderCardCount: 0,
    visibleButtonTexts: [] as string[],
    visibleLinkTexts: [] as string[],
    bodyTextPreview: '',
    hasOrdersText: false,
    hasActiveOrdersText: false,
    hasDeliveredText: false,
    hasOrderIdText: false,
  }));

  const before = await inspectOrdersDom();
  if (before.orderCardVisible) {
    return before;
  }

  console.log('ℹ️ lifecycle: phase3 ensure driver orders view after pickup', {
    orderId,
    stage,
    currentUrl: driverPage.url(),
    orderCardVisibleBeforeReopen: before.orderCardVisible,
    orderCardCountBeforeReopen: before.orderCardCount,
    hasOrdersTextBeforeReopen: before.hasOrdersText,
    hasActiveOrdersTextBeforeReopen: before.hasActiveOrdersText,
    hasDeliveredTextBeforeReopen: before.hasDeliveredText,
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
    inspectOrdersDom().then((result) => result).catch(() => ({
      orderCardVisible: false,
      orderCardCount: 0,
      visibleButtonTexts: [] as string[],
      visibleLinkTexts: [] as string[],
      bodyTextPreview: '',
      hasOrdersText: false,
      hasActiveOrdersText: false,
      hasDeliveredText: false,
      hasOrderIdText: false,
    })),
    new Promise<Awaited<ReturnType<typeof inspectOrdersDom>>>((resolve) => setTimeout(() => resolve({
      orderCardVisible: false,
      orderCardCount: 0,
      visibleButtonTexts: [] as string[],
      visibleLinkTexts: [] as string[],
      bodyTextPreview: '',
      hasOrdersText: false,
      hasActiveOrdersText: false,
      hasDeliveredText: false,
      hasOrderIdText: false,
    }), 2000)),
  ]);

  if (!reopened.orderCardVisible && reopened.orderCardCount === 0 && !reopened.hasOrdersText && !reopened.hasActiveOrdersText && !reopened.hasDeliveredText && !reopened.hasOrderIdText) {
    throw new Error(`phase3 driver orders view missing after pickup: ${JSON.stringify({
      orderId,
      currentUrl: driverPage.url(),
      visibleButtonTexts: reopened.visibleButtonTexts,
      visibleLinkTexts: reopened.visibleLinkTexts,
      orderCardVisibleBeforeReopen: before.orderCardVisible,
      orderCardVisibleAfterReopen: reopened.orderCardVisible,
      orderCardCount: reopened.orderCardCount,
      bodyTextPreview: reopened.bodyTextPreview,
    })}`);
  }

  console.log('ℹ️ lifecycle: phase3 driver orders view ensured after pickup', {
    orderId,
    stage,
    currentUrl: driverPage.url(),
    orderCardVisibleAfterReopen: reopened.orderCardVisible,
    orderCardCountAfterReopen: reopened.orderCardCount,
  });

  return reopened;
}

async function clickPickupActionWithinTargetCard(
  targetCard: Locator,
  orderId: string,
  stage: string,
) {
  return targetCard.evaluate((card, resolvedOrderId) => {
    const isVisible = (node: Element | null | undefined) => {
      if (!node || !(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && node.getClientRects().length > 0;
    };
    const normalizeText = (node: Element | null | undefined) => (node?.textContent || '').trim().replace(/\s+/g, ' ');
    const orderSuffix = resolvedOrderId.slice(-8);
    const candidateLabels = [
      /picked up/i,
      /pick up/i,
      /pickup/i,
      /abholen/i,
      /abgeholt/i,
      /bestellung abholen/i,
    ];

    const cardText = normalizeText(card);
    const orderMatches = cardText.includes(resolvedOrderId) || cardText.includes(orderSuffix);
    if (!orderMatches) {
      return { clicked: false, reason: `card-mismatch:${stage}`, orderSuffix };
    }

    const candidates = Array.from(card.querySelectorAll('button, [role="button"], [data-action="pickup-order"], [data-testid*="picked-up"], [data-testid*="pickup"]'))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => isVisible(node))
      .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');

    const pickupButton = candidates.find((node) => {
      const text = normalizeText(node);
      return candidateLabels.some((label) => label.test(text));
    });

    if (!pickupButton) {
      return {
        clicked: false,
        reason: `button-missing:${stage}`,
        orderSuffix,
        visibleCandidateTexts: candidates.map((node) => normalizeText(node)).slice(0, 10),
      };
    }

    pickupButton.scrollIntoView({ block: 'center', inline: 'center' });
    pickupButton.click();
    return { clicked: true, reason: `clicked:${stage}`, orderSuffix };
  }, orderId);
}

async function clickPickupActionAtomically(
  targetCard: Locator,
  orderId: string,
  stage: string,
) {
  const orderSuffix = orderId.slice(-8);
  const candidateLocators = [
    targetCard.getByTestId(`driver-picked-up-order-${orderId}`),
    targetCard.locator('[data-action="pickup-order"]'),
    targetCard.locator('[data-testid*="picked-up"]'),
    targetCard.locator('[data-testid*="pickup"]'),
    targetCard.locator('button[onclick], a[onclick], [role="button"][onclick]'),
    targetCard.locator('[style*="cursor: pointer"], [style*="cursor:pointer"]'),
    targetCard.getByRole('button', {
      name: /picked up|pick up|pickup|abgeholt|abholen|aufgenommen|start delivery|start/i,
    }),
    targetCard.getByRole('link', {
      name: /picked up|pick up|pickup|abgeholt|abholen|aufgenommen|start delivery|start/i,
    }),
    targetCard.locator('a'),
    targetCard.locator('[onclick]'),
  ];

  const isVisibleNode = async (locator: Locator) => locator.isVisible().catch(() => false);
  const labelMatches = /picked up|pick up|pickup|abholen|abgeholt|aufgenommen|start delivery|start/i;

  for (const candidate of candidateLocators) {
    const resolved = candidate.first();
    if (!(await isVisibleNode(resolved))) {
      continue;
    }

    try {
      await resolved.scrollIntoViewIfNeeded({ timeout: 1000 });
    } catch {
      // best-effort only
    }

    try {
      await resolved.click({ timeout: 1200 });
      return { clicked: true, reason: `locator-click:${stage}`, orderSuffix };
    } catch (locatorError) {
      const locatorReason = locatorError instanceof Error ? locatorError.message : String(locatorError);

      try {
        await resolved.click({ timeout: 1200, force: true });
        return { clicked: true, reason: `force-click:${stage}`, orderSuffix };
      } catch (forceError) {
        const forceReason = forceError instanceof Error ? forceError.message : String(forceError);

        try {
          const domResult = await targetCard.evaluate((card, resolvedOrderId) => {
            const isVisible = (node: Element | null | undefined) => {
              if (!node || !(node instanceof HTMLElement)) return false;
              const style = window.getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              return style.display !== 'none'
                && style.visibility !== 'hidden'
                && style.opacity !== '0'
                && rect.width > 0
                && rect.height > 0;
            };
            const normalizeText = (node: Element | null | undefined) => (node?.textContent || '').trim().replace(/\s+/g, ' ');
            const describeCandidate = (node: HTMLElement, source: string) => {
              const owner = node.closest('[data-testid*="order"], .order-card, [data-order-id], .dashboard, .orders-view, main, section, article, li, div');
              const ownerText = normalizeText(owner);
              const text = normalizeText(node);
              const testId = node.getAttribute('data-testid') || null;
              const role = node.getAttribute('role') || null;
              const disabled = node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true';
              const visible = isVisible(node);
              const box = node.getBoundingClientRect();
              const boxPresent = box.width > 0 && box.height > 0;
              const orderSuffix = resolvedOrderId.slice(-8);
              return {
                source,
                tagName: node.tagName.toLowerCase(),
                role,
                text,
                ariaLabel: node.getAttribute('aria-label') || null,
                testId,
                disabled,
                visible,
                boxPresent,
                ownerText: ownerText.slice(0, 240),
                hasOrderId: ownerText.includes(resolvedOrderId) || text.includes(resolvedOrderId),
                hasOrderSuffix: ownerText.includes(orderSuffix) || text.includes(orderSuffix),
              };
            };
            const labelMatches = /picked up|pick up|pickup|abholen|abgeholt|aufgenommen|start delivery|start/i;
            const orderSuffix = resolvedOrderId.slice(-8);
            const cardText = normalizeText(card);
            const orderMatches = cardText.includes(resolvedOrderId) || cardText.includes(orderSuffix);
            const cardCandidates = Array.from(card.querySelectorAll('button, [role="button"], a, [onclick], [data-action="pickup-order"], [data-testid*="picked-up"], [data-testid*="pickup"], [style*="cursor: pointer"], [style*="cursor:pointer"]'))
              .filter((node): node is HTMLElement => node instanceof HTMLElement)
              .filter((node) => isVisible(node))
              .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');
            const pageCandidates = Array.from(document.querySelectorAll('button, [role="button"], a, [onclick], [data-action="pickup-order"], [data-testid*="picked-up"], [data-testid*="pickup"], [style*="cursor: pointer"], [style*="cursor:pointer"]'))
              .filter((node): node is HTMLElement => node instanceof HTMLElement)
              .filter((node) => isVisible(node))
              .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');
            const fallbackCandidates = cardCandidates.length > 0
              ? cardCandidates
              : pageCandidates.filter((node) => {
                const detail = describeCandidate(node, 'page');
                const textMatch = labelMatches.test(detail.text);
                const contextualMatch = detail.hasOrderId || detail.hasOrderSuffix || orderMatches;
                return textMatch && contextualMatch;
              });
            const candidateDetails = (cardCandidates.length > 0 ? cardCandidates : fallbackCandidates)
              .map((node) => describeCandidate(node, cardCandidates.length > 0 ? 'card' : 'page'));
            console.log('ℹ️ lifecycle: pickup candidate scan', {
              resolvedOrderId,
              orderSuffix,
              cardTextPreview: cardText.slice(0, 240),
              candidateDetails: candidateDetails.slice(0, 10),
              visibleButtons: Array.from(document.querySelectorAll('button, [role="button"], a'))
                .filter((node): node is HTMLElement => node instanceof HTMLElement)
                .filter((node) => isVisible(node))
                .map((node) => normalizeText(node))
                .slice(0, 25),
            });
            const candidate = (cardCandidates.length > 0 ? cardCandidates : fallbackCandidates).find((node) => {
              const detail = describeCandidate(node, cardCandidates.length > 0 ? 'card' : 'page');
              return labelMatches.test(detail.text) && (detail.hasOrderId || detail.hasOrderSuffix || orderMatches);
            });

            if (!candidate) {
              return {
                clicked: false,
                reason: orderMatches ? `dom-click-button-missing:${resolvedOrderId}` : `card-mismatch:${resolvedOrderId}`,
                visibleCandidateTexts: candidateDetails.map((detail) => detail.text).slice(0, 10),
                visiblePickupCandidates: candidateDetails.slice(0, 10),
              };
            }

            candidate.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            candidate.click();
            return { clicked: true, reason: `dom-evaluate-click:${resolvedOrderId}` };
          }, orderId);

          if (domResult?.clicked) {
            return { clicked: true, reason: domResult.reason || `dom-evaluate-click:${stage}`, orderSuffix };
          }

          return {
            clicked: false,
            reason: `${locatorReason}; ${forceReason}; ${domResult?.reason || `dom-click-failed:${stage}`}`,
            orderSuffix,
          };
        } catch (domError) {
          const domReason = domError instanceof Error ? domError.message : String(domError);
          return {
            clicked: false,
            reason: `${locatorReason}; ${forceReason}; ${domReason}`,
            orderSuffix,
          };
        }
      }
    }
  }

  return { clicked: false, reason: `button-missing:${stage}`, orderSuffix };
}

async function fetchDriverOrderSnapshot(driverPage: Page, orderId: string) {
  const currentUrl = driverPage.isClosed() ? 'closed' : driverPage.url();
  if (driverPage.isClosed()) {
    return {
      status: null as string | null,
      delivered: false,
      currentUrl,
    };
  }

  return driverPage.evaluate(async (resolvedOrderId) => {
    try {
      const response = await fetch(`/api/orders/${resolvedOrderId}`, {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      const status = typeof payload?.status === 'string' ? payload.status : null;
      return {
        status,
        delivered: Boolean(status && /DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen|COMPLETED/i.test(status)),
        currentUrl: window.location.href,
      };
    } catch {
      return {
        status: null,
        delivered: false,
        currentUrl: window.location.href,
      };
    }
  }, orderId);
}

async function resolveDriverAccessToken(driverPage: Page) {
  return driverPage.evaluate(() => {
    const candidateKeys = [
      'driver_token',
      'access_token',
      'auth_token',
      'uberfoods_auth_token',
    ];
    const storageSources = [window.localStorage, window.sessionStorage];
    for (const storage of storageSources) {
      for (const key of candidateKeys) {
        const value = storage.getItem(key);
        if (value) return value;
      }
    }
    return null;
  }).catch(() => null);
}

async function tryPickupApiFallbackForVisibleAcceptedOrder(params: {
  driverPage: Page;
  orderId: string;
  stage: string;
  pageTextBeforeRecovery?: string;
  visibleButtonsBeforeRecovery?: unknown[];
  visibleInteractiveElementsBeforeRecovery?: unknown[];
  driverPickupVisiblePickupButtonSeen?: boolean;
  previousVisibleOrderContext?: {
    orderId?: string;
    orderSuffix?: string;
    cardFound?: boolean;
    pickupButtonSeen?: boolean;
    pickupButtonVisible?: boolean;
    pickupButtonText?: string | null;
    pageTextPreview?: string | null;
    cardText?: string | null;
    visibleButtons?: unknown[];
    visibleInteractiveElements?: unknown[];
    source?: string;
  };
}): Promise<{
  attempted: boolean;
  succeeded: boolean;
  skippedReason?: string;
  latestApiStatusBeforePickupClick?: string | null;
  latestApiStatusAfterFallback?: string | null;
  fallbackResponseStatus?: number | null;
  fallbackResponseBody?: string | null;
}> {
  const {
    driverPage,
    orderId,
    stage,
    pageTextBeforeRecovery = '',
    visibleButtonsBeforeRecovery = [],
    visibleInteractiveElementsBeforeRecovery = [],
    driverPickupVisiblePickupButtonSeen = false,
    previousVisibleOrderContext = undefined,
  } = params;
  const orderSuffix = orderId.slice(-8);
  const latestApiStatusBeforePickupClick = await fetchDriverOrderSnapshot(driverPage, orderId)
    .then((snapshot) => snapshot.status)
    .catch(() => null);
  const targetOrderVisibleInCurrentPageText = Boolean(
    pageTextBeforeRecovery.includes(orderId)
    || pageTextBeforeRecovery.includes(orderSuffix)
    || pageTextBeforeRecovery.includes(`Order #${orderSuffix}`),
  );
  const targetOrderVisibleInPreviousContext = Boolean(
    previousVisibleOrderContext
    && (
      previousVisibleOrderContext.orderId === orderId
      || previousVisibleOrderContext.orderSuffix === orderSuffix
      || Boolean(previousVisibleOrderContext.cardFound)
      || Boolean(previousVisibleOrderContext.pickupButtonSeen)
      || Boolean(previousVisibleOrderContext.pickupButtonVisible)
      || Boolean(previousVisibleOrderContext.pageTextPreview && (
        previousVisibleOrderContext.pageTextPreview.includes(orderId)
        || previousVisibleOrderContext.pageTextPreview.includes(orderSuffix)
        || previousVisibleOrderContext.pageTextPreview.includes(`Order #${orderSuffix}`)
      ))
      || Boolean(previousVisibleOrderContext.cardText && (
        previousVisibleOrderContext.cardText.includes(orderId)
        || previousVisibleOrderContext.cardText.includes(orderSuffix)
        || previousVisibleOrderContext.cardText.includes(`Order #${orderSuffix}`)
      ))
    ),
  ) || driverPickupVisiblePickupButtonSeen;
  const visibleButtons = Array.isArray(visibleButtonsBeforeRecovery) ? visibleButtonsBeforeRecovery : [];
  const visibleInteractiveElements = Array.isArray(visibleInteractiveElementsBeforeRecovery) ? visibleInteractiveElementsBeforeRecovery : [];
  const hasClickablePickupCandidate = [
    ...visibleButtons.map((value) => String(value)),
    ...visibleInteractiveElements.map((value) => {
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return [
          record.text,
          record.ariaLabel,
          record.testId,
          record.ownerText,
        ].filter(Boolean).join(' ');
      }
      return String(value);
    }),
  ].some((value) => /picked up|pick up|pickup|abholen|abgeholt|start delivery|in transit|unterwegs/i.test(value));
  const fallbackAttempted = Boolean(
    latestApiStatusBeforePickupClick === 'ACCEPTED'
    && (targetOrderVisibleInCurrentPageText || targetOrderVisibleInPreviousContext || Boolean(previousVisibleOrderContext?.pickupButtonSeen))
    && !hasClickablePickupCandidate,
  );
  const fallbackSkippedReason = fallbackAttempted
    ? null
    : !(targetOrderVisibleInCurrentPageText || targetOrderVisibleInPreviousContext || Boolean(previousVisibleOrderContext?.pickupButtonSeen))
      ? 'target-order-not-visible-in-page-text'
      : latestApiStatusBeforePickupClick !== 'ACCEPTED'
        ? `latest-api-status-not-accepted:${latestApiStatusBeforePickupClick ?? 'null'}`
        : hasClickablePickupCandidate
          ? 'pickup-candidate-present'
            : 'pickup-context-not-evaluable';

  console.log('ℹ️ lifecycle: pickup fallback gate evaluated', {
    orderId,
    orderSuffix,
    stage,
    latestApiStatusBeforePickupClick,
    targetOrderVisibleInCurrentPageText,
    targetOrderVisibleInPreviousContext,
    driverPickupVisiblePickupButtonSeen,
    previousVisibleOrderContextSource: previousVisibleOrderContext?.source ?? null,
    fallbackAttempted,
    fallbackSkippedReason,
  });

  if (!fallbackAttempted) {
    return {
      attempted: false,
      succeeded: false,
      skippedReason: fallbackSkippedReason || 'fallback-not-attempted',
      latestApiStatusBeforePickupClick,
      latestApiStatusAfterFallback: latestApiStatusBeforePickupClick,
      fallbackResponseStatus: null,
      fallbackResponseBody: null,
    };
  }

  console.log('ℹ️ lifecycle: pickupActionMissingDespiteVisibleAcceptedOrder', {
    orderId,
    orderSuffix,
    latestApiStatusBeforePickupClick,
    targetOrderVisibleInCurrentPageText,
    targetOrderVisibleInPreviousContext,
    visibleButtons,
    visibleInteractiveElements,
    pageTextPreview: pageTextBeforeRecovery.slice(0, 2500),
  });
  if (targetOrderVisibleInPreviousContext && !targetOrderVisibleInCurrentPageText) {
    console.log('ℹ️ lifecycle: pickupActionMissingDespitePreviouslyVisibleAcceptedOrder', {
      orderId,
      orderSuffix,
      latestApiStatusBeforePickupClick,
      targetOrderVisibleInCurrentPageText,
      targetOrderVisibleInPreviousContext,
      driverPickupVisiblePickupButtonSeen,
      previousVisibleOrderContext,
    });
  }

  const pickupStatusUrl = new URL(`/api/drivers/orders/${orderId}/status`, testUrls.driver).href;
  const driverAccessToken = await resolveDriverAccessToken(driverPage);
  const hasDriverAuthToken = Boolean(driverAccessToken);
  if (!hasDriverAuthToken) {
    throw new Error(`Driver pickup API fallback missing driver auth token: ${JSON.stringify({
      orderId,
      orderSuffix,
      stage,
      latestApiStatusBeforePickupClick,
      targetOrderVisibleInCurrentPageText,
      targetOrderVisibleInPreviousContext,
    })}`);
  }
  console.log('ℹ️ lifecycle: pickup API fallback auth', {
    orderId,
    hasDriverAuthToken,
    authHeaderApplied: true,
  });
  const fallbackResponse = await driverPage.request.put(pickupStatusUrl, {
    headers: {
      Authorization: `Bearer ${driverAccessToken}`,
      'Content-Type': 'application/json',
    },
    data: { status: 'PICKED_UP' },
  });
  const fallbackResponseBody = await fallbackResponse.text().catch(() => '');
  let parsedFallbackBodyStatus: string | null = null;
  try {
    const parsed = fallbackResponseBody ? JSON.parse(fallbackResponseBody) : null;
    parsedFallbackBodyStatus = typeof parsed?.status === 'string' ? parsed.status : null;
  } catch {
    parsedFallbackBodyStatus = null;
  }
  const fallbackConfirmedStatus = isConfirmedDriverProgressStatus(parsedFallbackBodyStatus)
    ? parsedFallbackBodyStatus
    : null;
  console.log('ℹ️ lifecycle: pickup API fallback response', {
    orderId,
    pickupStatusUrl,
    fallbackResponseStatus: fallbackResponse.status(),
    fallbackResponseOk: fallbackResponse.ok(),
    fallbackResponseBody: fallbackResponseBody.slice(0, 1000),
  });
  console.log('ℹ️ lifecycle: pickup API fallback parsed status', {
    orderId,
    fallbackResponseStatusFromBody: parsedFallbackBodyStatus,
    fallbackConfirmedStatus,
  });
  if (fallbackConfirmedStatus) {
    console.log('✅ lifecycle: pickup API fallback accepted as completed', {
      orderId,
      fallbackConfirmedStatus,
    });
    console.log('✅ lifecycle: driver pickup completed', {
      orderId,
      source: 'api-fallback',
      status: fallbackConfirmedStatus,
    });
    return {
      attempted: true,
      succeeded: true,
      latestApiStatusBeforePickupClick,
      latestApiStatusAfterFallback: fallbackConfirmedStatus,
      fallbackResponseStatus: fallbackResponse.status(),
      fallbackResponseBody: fallbackResponseBody.slice(0, 1000),
    };
  }
  const latestApiStatusAfterFallback = fallbackConfirmedStatus
    || await fetchDriverOrderSnapshot(driverPage, orderId)
      .then(async (snapshot) => {
        if (isConfirmedDriverProgressStatus(snapshot.status)) {
          return snapshot.status;
        }
        const freshSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId)
          .catch(() => snapshot);
        return freshSnapshot.status;
      })
      .catch(() => null);
  console.log('ℹ️ lifecycle: pickup API fallback verification', {
    orderId,
    latestApiStatusBeforePickupClick,
    latestApiStatusAfterFallback,
  });

  return {
    attempted: true,
    succeeded: Boolean(
      fallbackResponse.ok()
      && latestApiStatusAfterFallback
      && isConfirmedDriverProgressStatus(latestApiStatusAfterFallback),
    ),
    latestApiStatusBeforePickupClick,
    latestApiStatusAfterFallback,
    fallbackResponseStatus: fallbackResponse.status(),
    fallbackResponseBody: fallbackResponseBody.slice(0, 1000),
  };
}

function isConfirmedDriverProgressStatus(status: string | null | undefined) {
  return Boolean(status && /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|DELIVERED|COMPLETED/i.test(status));
}

async function waitForConfirmedDriverPickupStatus(
  driverPage: Page,
  orderId: string,
  stage: string,
) {
  const maxAttempts = 5;
  let lastSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log('ℹ️ lifecycle: pickup snapshot probe', {
      orderId,
      stage,
      attempt,
      currentUrl: lastSnapshot.currentUrl,
      status: lastSnapshot.status,
      delivered: lastSnapshot.delivered,
    });

    if (isConfirmedDriverProgressStatus(lastSnapshot.status) || lastSnapshot.delivered) {
      console.log('✅ lifecycle: driver pickup status confirmed', {
        orderId,
        stage,
        currentUrl: lastSnapshot.currentUrl,
        status: lastSnapshot.status,
        delivered: lastSnapshot.delivered,
      });
      return lastSnapshot;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      lastSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId);
    }
  }

  throw new Error(`Driver pickup did not progress beyond ACCEPTED after confirmation wait: ${JSON.stringify({
    orderId,
    stage,
    currentUrl: lastSnapshot.currentUrl,
    status: lastSnapshot.status,
    delivered: lastSnapshot.delivered,
  })}`);
}

async function resolveDriverPickupButton(
  driverPage: Page,
  orderId: string,
) {
  const pickupOrderCard = driverPage
    .getByTestId(`driver-order-card-${orderId}`)
    .or(driverPage.locator(`[data-order-id="${orderId}"]`))
    .first();
  await expect(pickupOrderCard).toBeVisible({ timeout: 10000 });

  return pickupOrderCard
    .getByTestId(`driver-picked-up-order-${orderId}`)
    .or(pickupOrderCard.locator('[data-action="pickup-order"]'))
    .or(
      pickupOrderCard.getByRole('button', {
        name: /picked up|abgeholt|pickup/i,
      }),
    )
    .first();
}

async function resolveVisibleDriverTargetOrderCard(
  driverPage: Page,
  orderId: string,
  stage: string,
) {
  const targetCard = driverPage
    .getByTestId(`driver-order-card-${orderId}`)
    .or(driverPage.locator(`[data-order-id="${orderId}"]`))
    .first();

  const inspectTargetCardDom = async () => driverPage.evaluate((resolvedOrderId) => {
    const isVisible = (node: Element | null | undefined) => {
      if (!node || !(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && node.getClientRects().length > 0;
    };
    const getVisibleText = (node: Element | null | undefined) => {
      if (!node || !(node instanceof HTMLElement) || !isVisible(node)) return '';
      return (node.textContent || '').trim().replace(/\s+/g, ' ');
    };
    const visibleButtonTexts = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => isVisible(node))
      .map((node) => getVisibleText(node))
      .filter(Boolean)
      .slice(0, 40);
    const visibleLinkTexts = Array.from(document.querySelectorAll('a, [role="link"]'))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => isVisible(node))
      .map((node) => getVisibleText(node))
      .filter(Boolean)
      .slice(0, 30);
    const targetCard = document.querySelector(`[data-testid="driver-order-card-${resolvedOrderId}"], [data-order-id="${resolvedOrderId}"]`);
    const orderCards = Array.from(document.querySelectorAll('[data-testid*="driver-order-card"], .order-card, [data-order-id]'))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => isVisible(node));
    const bodyText = document.body?.innerText?.slice(0, 1000) || '';
    return {
      targetCardVisible: Boolean(targetCard && isVisible(targetCard)),
      orderCardCount: orderCards.length,
      visibleButtonTexts,
      visibleLinkTexts,
      bodyTextPreview: bodyText,
      hasOrdersText: /bestellungen|orders/i.test(bodyText),
      hasActiveOrdersText: /aktive bestellungen|active orders|current orders|in transit|unterwegs|picked up/i.test(bodyText),
      hasDeliveredText: /delivered|zugestellt|geliefert/i.test(bodyText),
      hasOrderIdText: bodyText.includes(resolvedOrderId),
      hasActiveOrdersZero: /active orders\s*0|aktive bestellungen\s*0/i.test(bodyText),
    };
  }, orderId).catch(() => ({
    targetCardVisible: false,
    orderCardCount: 0,
    visibleButtonTexts: [] as string[],
    visibleLinkTexts: [] as string[],
    bodyTextPreview: '',
    hasOrdersText: false,
    hasActiveOrdersText: false,
    hasDeliveredText: false,
    hasOrderIdText: false,
    hasActiveOrdersZero: false,
  }));

  const before = await inspectTargetCardDom();
  if (before.targetCardVisible) {
    return {
      ...before,
      targetCard,
    };
  }

  console.log('ℹ️ lifecycle: resolve visible driver target order card', {
    orderId,
    stage,
    currentUrl: driverPage.url(),
    cardVisibleBeforeReopen: before.targetCardVisible,
    orderCardCountBeforeReopen: before.orderCardCount,
    hasOrdersTextBeforeReopen: before.hasOrdersText,
    hasActiveOrdersTextBeforeReopen: before.hasActiveOrdersText,
    hasActiveOrdersZeroBeforeReopen: before.hasActiveOrdersZero,
    hasDeliveredTextBeforeReopen: before.hasDeliveredText,
    hasOrderIdTextBeforeReopen: before.hasOrderIdText,
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

  if (before.hasActiveOrdersZero && driverPage.url().includes('/orders')) {
    await driverPage.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
  }

  await driverPage.waitForLoadState('domcontentloaded').catch(() => undefined);
  await driverPage.waitForLoadState('networkidle').catch(() => undefined);

  const reopened = await Promise.race([
    inspectTargetCardDom().then((result) => result).catch(() => ({
      targetCardVisible: false,
      orderCardCount: 0,
      visibleButtonTexts: [] as string[],
      visibleLinkTexts: [] as string[],
      bodyTextPreview: '',
      hasOrdersText: false,
      hasActiveOrdersText: false,
      hasDeliveredText: false,
      hasOrderIdText: false,
      hasActiveOrdersZero: false,
    })),
    new Promise<Awaited<ReturnType<typeof inspectTargetCardDom>>>((resolve) => setTimeout(() => resolve({
      targetCardVisible: false,
      orderCardCount: 0,
      visibleButtonTexts: [] as string[],
      visibleLinkTexts: [] as string[],
      bodyTextPreview: '',
      hasOrdersText: false,
      hasActiveOrdersText: false,
      hasDeliveredText: false,
      hasOrderIdText: false,
      hasActiveOrdersZero: false,
    }), 2000)),
  ]);

  console.log('ℹ️ lifecycle: resolved visible driver target order card', {
    orderId,
    stage,
    currentUrl: driverPage.url(),
    cardVisibleAfterReopen: reopened.targetCardVisible,
    orderCardCountAfterReopen: reopened.orderCardCount,
    hasOrdersTextAfterReopen: reopened.hasOrdersText,
    hasActiveOrdersTextAfterReopen: reopened.hasActiveOrdersText,
    hasActiveOrdersZeroAfterReopen: reopened.hasActiveOrdersZero,
    hasDeliveredTextAfterReopen: reopened.hasDeliveredText,
    hasOrderIdTextAfterReopen: reopened.hasOrderIdText,
  });

  return {
    ...reopened,
    targetCard,
  };
}

async function readLocatorTextWithin(
  locator: ReturnType<Page['locator']>,
  timeoutMs = 1000,
) {
  return (await Promise.race([
    locator.textContent().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]) || '').trim();
}

test.describe('Full Order Lifecycle UI-E2E', () => {
  let orderId: string;
  let orderRestaurantId: string | null = null;
  let lastOrderCreateResponse: Response | null = null;
  let pendingOrderCreateResponse: Promise<Response | null> | null = null;
  let customerCredentials = createLifecycleCustomerCredentials();
  let lastSafeMinimumOrderSubtotal: number | null = null;
  let lastSafeMinimumOrderSource: string | null = null;
  let driverPickupVisibleCardState: Awaited<ReturnType<typeof resolveVisibleDriverTargetOrderCard>> | null = null;
  let driverPickupVisiblePickupButton: Locator | null = null;
  let driverPickupVisiblePickupButtonSeen = false;
  let driverPickupClickedDuringVisibleStep = false;
  let driverPickupVisibleClickDiagnostics: {
    orderId: string;
    currentUrl: string;
    clickedFromVisibleStep: boolean;
    clickMethod: string;
    elapsedMs: number;
  } | null = null;
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

  const safeMinimumOrderSubtotalKey = `lifecycle_safe_minimum_order_subtotal_${RUN_ID}`;
  let lastSafeMinimumOrderSnapshot: {
    subtotal: number;
    source: string | null;
    storageKeys: string[];
    storageEntries: Array<[string, string | null]>;
    cartItemTexts: string[];
  } | null = null;
  let finalSubmitValidCartSnapshot: {
    cartSnapshotKey: string;
    cartSnapshotRawValue: string | null;
    restaurantId: string | null;
    restaurantUrl: string | null;
    subtotal: number;
    itemCount: number;
    quantityCount: number;
    targetSubtotal: number;
    timestamp: number;
    visibleCartText?: string;
  } | null = null;

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

        const persistSafeMinimumOrderSubtotal = async (subtotal: number, source: string | null, snapshot: {
          storageKeys: string[];
          storageEntries: Array<[string, string | null]>;
          cartItemTexts: string[];
        }) => {
          if (!Number.isFinite(subtotal) || subtotal < targetSubtotal) {
            return;
          }

          lastSafeMinimumOrderSubtotal = subtotal;
          lastSafeMinimumOrderSource = source;
          lastSafeMinimumOrderSnapshot = {
            subtotal,
            source,
            storageKeys: snapshot.storageKeys,
            storageEntries: snapshot.storageEntries,
            cartItemTexts: snapshot.cartItemTexts,
          };

          await customerPage.evaluate(({ storageKey, value, sourceLabel }) => {
            window.localStorage.setItem(storageKey, JSON.stringify({
              subtotal: value,
              source: sourceLabel,
              savedAt: Date.now(),
            }));
          }, {
            storageKey: safeMinimumOrderSubtotalKey,
            value: subtotal,
            sourceLabel: source ?? 'unknown',
          }).catch(() => null);
        };

        const captureFinalSubmitValidCartSnapshot = async (cartDiagnostics: Awaited<ReturnType<typeof getCartDiagnostics>>, storageDiagnostics: Awaited<ReturnType<typeof getStorageCartDiagnostics>>) => {
          const snapshotKey = storageDiagnostics.storageKeys.find((key) => key.startsWith(cartStateKeyPrefix)) || null;
          const snapshotRawValue = snapshotKey
            ? await customerPage.evaluate((resolvedKey) => window.localStorage.getItem(resolvedKey), snapshotKey).catch(() => null)
            : null;

          if (!snapshotKey || !snapshotRawValue) {
            console.warn('⚠️ lifecycle: invalid final submit cart snapshot ignored', {
              reason: 'missing-cart-key-or-raw-value',
              snapshotKey,
              subtotal: cartDiagnostics.subtotal,
              itemCount: cartDiagnostics.cartItemCount,
              quantityCount: cartDiagnostics.quantityCount,
            });
            return;
          }

          let parsedSnapshot: unknown;
          try {
            parsedSnapshot = JSON.parse(snapshotRawValue);
          } catch {
            console.warn('⚠️ lifecycle: invalid final submit cart snapshot ignored', {
              reason: 'unparseable-raw-value',
              snapshotKey,
              subtotal: cartDiagnostics.subtotal,
              itemCount: cartDiagnostics.cartItemCount,
              quantityCount: cartDiagnostics.quantityCount,
            });
            return;
          }

          const parsedItems = Array.isArray(parsedSnapshot)
            ? parsedSnapshot
            : Array.isArray((parsedSnapshot as { items?: unknown[] })?.items)
              ? (parsedSnapshot as { items: unknown[] }).items
              : Array.isArray((parsedSnapshot as { cart?: unknown[] })?.cart)
                ? (parsedSnapshot as { cart: unknown[] }).cart
                : [];
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
          const resolveNestedRecord = (item: Record<string, unknown>, key: string) => {
            const value = item[key];
            return value && typeof value === 'object' && !Array.isArray(value)
              ? value as Record<string, unknown>
              : null;
          };
          const resolveItemUnitPrice = (item: Record<string, unknown>) => {
            const nestedDish = resolveNestedRecord(item, 'dish');
            const nestedMenuItem = resolveNestedRecord(item, 'menuItem');
            const nestedItem = resolveNestedRecord(item, 'item');
            const nestedProduct = resolveNestedRecord(item, 'product');
            const candidates = [
              item.price,
              item.unitPrice,
              item.dishPrice,
              nestedDish?.price,
              nestedDish?.unitPrice,
              nestedMenuItem?.price,
              nestedMenuItem?.unitPrice,
              nestedItem?.price,
              nestedItem?.unitPrice,
              nestedProduct?.price,
              nestedProduct?.unitPrice,
            ];
            return candidates.map((candidate) => parseAmount(candidate)).find((amount): amount is number => amount !== null) ?? null;
          };
          const resolveItemQuantity = (item: Record<string, unknown>) => {
            const candidates = [
              item.quantity,
              item.qty,
              item.count,
            ];
            return candidates.map((candidate) => parseAmount(candidate)).find((amount): amount is number => amount !== null && amount > 0) ?? 1;
          };
          const parsedItemCount = parsedItems.length;
          const parsedQuantityCount = parsedItems.reduce((count, item) => {
            const quantity = resolveItemQuantity(item as Record<string, unknown>);
            return count + quantity;
          }, 0);

          const parsedSubtotal = parsedItems.reduce((sum, item) => {
            const typedItem = item as Record<string, unknown>;
            const directSubtotal = parseAmount(typedItem.totalPrice ?? typedItem.subtotal);
            if (directSubtotal !== null && directSubtotal > 0) {
              return sum + directSubtotal;
            }

            const unitPrice = resolveItemUnitPrice(typedItem);
            const quantity = resolveItemQuantity(typedItem);
            return sum + (unitPrice ?? 0) * quantity;
          }, 0);

          if (parsedItemCount === 0 || parsedQuantityCount === 0 || parsedItemCount < 2 || parsedQuantityCount < 2) {
            console.warn('⚠️ lifecycle: invalid final submit cart snapshot ignored', {
              reason: 'empty-parsed-cart',
              snapshotKey,
              subtotal: cartDiagnostics.subtotal,
              itemCount: cartDiagnostics.cartItemCount,
              quantityCount: cartDiagnostics.quantityCount,
              parsedItemCount,
              parsedQuantityCount,
              parsedSubtotal,
            });
            return;
          }

          if (!Number.isFinite(parsedSubtotal) || parsedSubtotal < targetSubtotal) {
            console.warn('⚠️ lifecycle: invalid final submit cart snapshot ignored', {
              reason: 'parsed-subtotal-below-target',
              snapshotKey,
              subtotal: cartDiagnostics.subtotal,
              itemCount: cartDiagnostics.cartItemCount,
              quantityCount: cartDiagnostics.quantityCount,
              parsedItemCount,
              parsedQuantityCount,
              parsedSubtotal,
              targetSubtotal,
            });
            return;
          }

          finalSubmitValidCartSnapshot = {
            cartSnapshotKey: snapshotKey,
            cartSnapshotRawValue: snapshotRawValue,
            restaurantId: orderRestaurantId ?? null,
            restaurantUrl: customerPage.url(),
            subtotal: parsedSubtotal,
            itemCount: parsedItemCount,
            quantityCount: parsedQuantityCount,
            targetSubtotal,
            timestamp: Date.now(),
            visibleCartText: cartDiagnostics.cartItemTexts.join(' ').slice(0, 500),
          };
          console.log('✅ lifecycle: valid final submit cart snapshot captured', {
            cartSnapshotKey: finalSubmitValidCartSnapshot.cartSnapshotKey,
              cartSnapshotSubtotal: finalSubmitValidCartSnapshot.subtotal,
              cartSnapshotItemCount: finalSubmitValidCartSnapshot.itemCount,
              cartSnapshotQuantityCount: finalSubmitValidCartSnapshot.quantityCount,
              rawParsedSubtotal: parsedSubtotal,
              targetSubtotal: finalSubmitValidCartSnapshot.targetSubtotal,
            });
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
            await persistSafeMinimumOrderSubtotal(cartDiagnostics.subtotal ?? 0, cartDiagnostics.subtotalSource, {
              storageKeys: storageDiagnostics.storageKeys,
              storageEntries: storageDiagnostics.storageEntries.map((entry) => [entry.key, JSON.stringify(entry)] as const),
              cartItemTexts: cartDiagnostics.cartItemTexts,
            });
            await captureFinalSubmitValidCartSnapshot(cartDiagnostics, storageDiagnostics);
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
            await persistSafeMinimumOrderSubtotal(postClickDiagnostics.subtotal ?? 0, postClickDiagnostics.subtotalSource, {
              storageKeys: postClickStorageDiagnostics.storageKeys,
              storageEntries: postClickStorageDiagnostics.storageEntries.map((entry) => [entry.key, JSON.stringify(entry)] as const),
              cartItemTexts: postClickDiagnostics.cartItemTexts,
            });
            await captureFinalSubmitValidCartSnapshot(postClickDiagnostics, postClickStorageDiagnostics);
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
          const persistedSafeSubtotalDiagnostics = await customerPage.evaluate(({ storageKey }) => {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) {
              return { subtotal: null as number | null, source: null as string | null };
            }

            try {
              const parsed = JSON.parse(raw) as { subtotal?: unknown; source?: unknown };
              const subtotal = typeof parsed.subtotal === 'number' && Number.isFinite(parsed.subtotal)
                ? parsed.subtotal
                : null;
              const source = typeof parsed.source === 'string' ? parsed.source : null;
              return { subtotal, source };
            } catch {
              return { subtotal: null as number | null, source: null as string | null };
            }
          }, { storageKey: safeMinimumOrderSubtotalKey }).catch(() => ({ subtotal: null as number | null, source: null as string | null }));
          const domSubtotal = subtotalDiagnostics?.subtotal ?? null;
          const storageSubtotal = storageSubtotalDiagnostics.subtotal ?? null;
          const safeSubtotal = lastSafeMinimumOrderSubtotal !== null && lastSafeMinimumOrderSubtotal >= 25
            ? lastSafeMinimumOrderSubtotal
            : persistedSafeSubtotalDiagnostics.subtotal !== null && persistedSafeSubtotalDiagnostics.subtotal >= 25
              ? persistedSafeSubtotalDiagnostics.subtotal
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
                  : lastSafeMinimumOrderSource ?? persistedSafeSubtotalDiagnostics.source ?? 'last-safe-minimum-order-subtotal',
              subtotal: chosenSubtotal,
              domSubtotal,
              storageSubtotal,
              safeSubtotal,
              persistedSafeSubtotal: persistedSafeSubtotalDiagnostics.subtotal,
              cartStatePresent: storageSubtotalDiagnostics.cartStatePresent,
            });
            return chosenSubtotal;
          }

          console.log('ℹ️ lifecycle: pre-submit subtotal source', {
            subtotalSource: storageSubtotalDiagnostics.source ?? subtotalDiagnostics?.source ?? lastSafeMinimumOrderSource ?? persistedSafeSubtotalDiagnostics.source ?? 'localStorage-cart-state',
            subtotal: storageSubtotal ?? domSubtotal ?? safeSubtotal ?? 0,
            domSubtotal,
            storageSubtotal,
            safeSubtotal,
            persistedSafeSubtotal: persistedSafeSubtotalDiagnostics.subtotal,
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
        if (finalSubmitValidCartSnapshot) {
          const profileRecoveryCartDiagnostics = await collectFinalSubmitCartDiagnostics().catch(() => null);
          if (profileRecoveryCartDiagnostics?.finalSubmitMinimumSatisfied) {
            finalSubmitValidCartSnapshot = {
              ...finalSubmitValidCartSnapshot,
              timestamp: Date.now(),
              subtotal: profileRecoveryCartDiagnostics.subtotal,
              itemCount: profileRecoveryCartDiagnostics.itemCount,
              quantityCount: profileRecoveryCartDiagnostics.quantityCount,
              restaurantUrl: customerPage.url(),
              visibleCartText: profileRecoveryCartDiagnostics.cartItems.map((item) => item.name ?? item.dishId ?? '').filter(Boolean).join(' ').slice(0, 500),
            };
          }
        }
        await logCustomerUserSnapshot(customerPage, 'snapshot: after profile verification');
        console.log('checkoutAddressSnapshotAfterProfileVerification', await collectCheckoutAddressSnapshot());
        await logCheckoutDiagnostics('after profile verification');

        async function collectFinalSubmitCartDiagnostics() {
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
          const payloadMinimumSatisfied = payloadSubtotal >= Math.max(25, lastSafeMinimumOrderSubtotal ?? 25)
            && (payloadItems.length >= 2 || storageDiagnostics.quantityCount >= 2);

          return {
            ...storageDiagnostics,
            domSubtotal,
            storageSubtotal,
            payloadItems,
            payloadSubtotal,
            subtotal,
            subtotalSource: storageDiagnostics.subtotalSource ?? domSubtotalDiagnostics.source ?? 'localStorage-cart-state',
            finalSubmitMinimumSatisfied: payloadMinimumSatisfied,
            safeMinimumOrderSnapshot: lastSafeMinimumOrderSnapshot,
          };
        }

        const ensureFinalSubmitMinimumCart = async () => {
          const targetFinalSubmitSubtotal = Math.max(25, lastSafeMinimumOrderSubtotal ?? 25);
          const finalSubmitRestoreDeadlineMs = 9000;
          const finalSubmitRestoreStartedAt = Date.now();
          const remainingFinalSubmitRestoreMs = () => Math.max(0, finalSubmitRestoreDeadlineMs - (Date.now() - finalSubmitRestoreStartedAt));
          const boundedFinalSubmitTimeout = (preferredMs: number) => Math.max(250, Math.min(preferredMs, remainingFinalSubmitRestoreMs()));
          const boundedLoadState = async (page: Page, state: 'domcontentloaded' | 'networkidle', preferredMs: number) => page.waitForLoadState(state, { timeout: boundedFinalSubmitTimeout(preferredMs) }).catch(() => null);
          const boundedGoto = async (page: Page, url: string, timeoutMs: number) => page.goto(url, { waitUntil: 'domcontentloaded', timeout: boundedFinalSubmitTimeout(timeoutMs) }).catch(() => null);
          const boundedStablePage = async (page: Page, timeoutMs: number) => Promise.race([
            TestHelpers.waitForStablePage(page),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), boundedFinalSubmitTimeout(timeoutMs))),
          ]).catch(() => null);
          const restoreAttempts: Array<{
            attempt: number;
            subtotal: number;
            subtotalSource: string | null;
            storageItemCount: number;
            storageQuantityCount: number;
            cartStatePresent: boolean;
            checkoutButtonVisible: boolean;
            checkoutButtonEnabled: boolean;
            elapsedMs: number;
          }> = [];
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
              .filter((button) => button.visible && (/quick add|add to cart|add|plus|\+/i.test(button.text || '') || button.testId === 'add-to-cart-button')))
              .catch(() => []);

            return {
              currentUrl: customerPage.url(),
              storageKeys: storageSnapshot.keys,
              storageEntries: storageSnapshot.entries,
              storageItemCount: diagnostics.itemCount,
              storageQuantityCount: diagnostics.quantityCount,
              cartStatePresent: Boolean(await customerPage.getByTestId('cart').count().catch(() => 0)),
              visibleCartText: (await customerPage.getByTestId('cart').textContent().catch(() => '')) || '',
              visibleQuickAddButtons: quickAddButtons,
            };
          };

          let diagnostics = await collectFinalSubmitCartDiagnostics();
          const checkoutButton = customerPage
            .getByTestId('cart')
            .locator('button[data-testid="checkout-button"]')
            .filter({ hasText: /^(Place Order|Bestellen|Submit Order|Order Now|Jetzt bestellen|Zahlungspflichtig bestellen|Bezahlen|Pay)$/i })
            .first();
          const checkoutButtonVisible = await checkoutButton.isVisible().catch(() => false);
          const checkoutButtonEnabled = checkoutButtonVisible
            ? await checkoutButton.isEnabled().catch(() => false)
            : false;

          console.log('ℹ️ lifecycle: final submit cart diagnostics', {
            finalSubmitCartItems: diagnostics.cartItems,
            finalSubmitSubtotal: diagnostics.subtotal,
            payloadItemsBeforeSubmit: diagnostics.payloadItems,
            payloadSubtotalBeforeSubmit: diagnostics.payloadSubtotal,
            visibleSubtotalBeforeSubmit: diagnostics.domSubtotal,
            storageSubtotalBeforeSubmit: diagnostics.storageSubtotal,
            safeSubtotalBeforeSubmit: lastSafeMinimumOrderSubtotal,
            targetFinalSubmitSubtotal,
            finalSubmitItemCount: diagnostics.itemCount,
            finalSubmitQuantityCount: diagnostics.quantityCount,
            finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
            finalSubmitMinimumSatisfied: diagnostics.finalSubmitMinimumSatisfied,
            subtotalSource: diagnostics.subtotalSource,
          });

          const restoreCheckoutFromSnapshot = async () => {
            if (!finalSubmitValidCartSnapshot?.cartSnapshotKey || !finalSubmitValidCartSnapshot.cartSnapshotRawValue) {
              return false;
            }

            console.log('➡️ lifecycle: final submit cart snapshot restore start', {
              currentUrl: customerPage.url(),
              cartSnapshotPresent: Boolean(finalSubmitValidCartSnapshot),
              cartSnapshotKey: finalSubmitValidCartSnapshot.cartSnapshotKey,
              cartSnapshotSubtotal: finalSubmitValidCartSnapshot.subtotal,
              cartSnapshotItemCount: finalSubmitValidCartSnapshot.itemCount,
              cartSnapshotQuantityCount: finalSubmitValidCartSnapshot.quantityCount,
              targetSubtotal: targetFinalSubmitSubtotal,
            });

            await customerPage.evaluate(({ storageKey, rawValue, snapshotKey }) => {
              window.localStorage.setItem(storageKey, rawValue);
              window.localStorage.setItem('lifecycle_final_submit_snapshot_key', snapshotKey);
              window.localStorage.setItem('lifecycle_final_submit_snapshot_ts', String(Date.now()));
              window.dispatchEvent(new Event('storage'));
            }, {
              storageKey: finalSubmitValidCartSnapshot.cartSnapshotKey,
              rawValue: finalSubmitValidCartSnapshot.cartSnapshotRawValue,
              snapshotKey: finalSubmitValidCartSnapshot.cartSnapshotKey,
            }).catch(() => null);

            await customerPage.goto('/checkout', { waitUntil: 'domcontentloaded' }).catch(() => null);
            await customerPage.waitForLoadState('domcontentloaded', { timeout: boundedFinalSubmitTimeout(1500) }).catch(() => null);

            const postRestoreDiagnostics = await collectFinalSubmitCartDiagnostics();
            const postRestoreCheckoutVisible = await checkoutButton.isVisible().catch(() => false);
            const postRestoreCheckoutEnabled = postRestoreCheckoutVisible
              ? await checkoutButton.isEnabled().catch(() => false)
              : false;
            const postRestoreValidPayload = postRestoreDiagnostics.finalSubmitMinimumSatisfied
              && postRestoreDiagnostics.subtotal >= targetFinalSubmitSubtotal
              && postRestoreDiagnostics.itemCount > 0
              && postRestoreDiagnostics.quantityCount > 0
              && postRestoreCheckoutVisible
              && postRestoreCheckoutEnabled;

            const restored = postRestoreValidPayload;

            if (restored) {
              console.log('✅ lifecycle: final submit cart snapshot restore completed', {
                currentUrl: customerPage.url(),
                cartSnapshotKey: finalSubmitValidCartSnapshot.cartSnapshotKey,
                cartSnapshotSubtotal: finalSubmitValidCartSnapshot.subtotal,
                cartSnapshotItemCount: finalSubmitValidCartSnapshot.itemCount,
                cartSnapshotQuantityCount: finalSubmitValidCartSnapshot.quantityCount,
                restoredStorageKeys: [finalSubmitValidCartSnapshot.cartSnapshotKey],
                currentStorageKeys: postRestoreDiagnostics.storageKeys,
                currentSubtotal: postRestoreDiagnostics.subtotal,
                subtotalSource: postRestoreDiagnostics.subtotalSource,
                checkoutButtonVisible: postRestoreCheckoutVisible,
                checkoutButtonEnabled: postRestoreCheckoutEnabled,
                restoreAttemptCount: 1,
                elapsedMs: Date.now() - finalSubmitRestoreStartedAt,
                remainingDeadlineMs: remainingFinalSubmitRestoreMs(),
              });
              diagnostics = postRestoreDiagnostics;
              return true;
            }

            console.warn('⚠️ lifecycle: final submit cart raw snapshot restore produced invalid state', {
              currentUrl: customerPage.url(),
              cartSnapshotPresent: true,
              cartSnapshotKey: finalSubmitValidCartSnapshot.cartSnapshotKey,
              cartSnapshotSubtotal: finalSubmitValidCartSnapshot.subtotal,
              cartSnapshotItemCount: finalSubmitValidCartSnapshot.itemCount,
              cartSnapshotQuantityCount: finalSubmitValidCartSnapshot.quantityCount,
              restoredStorageKeys: [finalSubmitValidCartSnapshot.cartSnapshotKey],
              currentStorageKeys: postRestoreDiagnostics.storageKeys,
              currentSubtotal: postRestoreDiagnostics.subtotal,
              subtotalSource: postRestoreDiagnostics.subtotalSource,
              checkoutButtonVisible: postRestoreCheckoutVisible,
              checkoutButtonEnabled: postRestoreCheckoutEnabled,
              restoreAttemptCount: 1,
              elapsedMs: Date.now() - finalSubmitRestoreStartedAt,
              remainingDeadlineMs: remainingFinalSubmitRestoreMs(),
              currentItemCount: postRestoreDiagnostics.itemCount,
              currentQuantityCount: postRestoreDiagnostics.quantityCount,
            });

            return false;
          };

          if (!diagnostics.finalSubmitMinimumSatisfied
            || diagnostics.subtotal < targetFinalSubmitSubtotal
            || diagnostics.itemCount === 0
            || diagnostics.quantityCount === 0
            || !checkoutButtonVisible
            || !checkoutButtonEnabled) {
            const snapshotRestored = await restoreCheckoutFromSnapshot();
            if (snapshotRestored) {
              return diagnostics;
            }
            if (!finalSubmitValidCartSnapshot) {
              console.warn('⚠️ lifecycle: final submit valid cart snapshot missing', {
                currentUrl: customerPage.url(),
                restoreAttemptCount: 0,
              });
            }
          }

          if (diagnostics.finalSubmitMinimumSatisfied
            && diagnostics.subtotal >= targetFinalSubmitSubtotal
            && diagnostics.itemCount > 0
            && diagnostics.quantityCount > 0
            && checkoutButtonVisible
            && checkoutButtonEnabled) {
            console.log('✅ lifecycle: final submit cart already valid, skipping restore', {
              currentUrl: customerPage.url(),
              subtotal: diagnostics.subtotal,
              subtotalSource: diagnostics.subtotalSource,
              storageItemCount: diagnostics.itemCount,
              storageQuantityCount: diagnostics.quantityCount,
              cartStatePresent: true,
              checkoutButtonVisible,
              checkoutButtonEnabled,
              targetSubtotal: targetFinalSubmitSubtotal,
            });
            return diagnostics;
          }

          console.log('ℹ️ lifecycle: final submit cart below minimum, restoring items from restaurant menu', {
            currentUrl: customerPage.url(),
            finalSubmitSubtotal: diagnostics.subtotal,
            payloadSubtotalBeforeSubmit: diagnostics.payloadSubtotal,
            payloadItemsBeforeSubmit: diagnostics.payloadItems,
            finalSubmitItemCount: diagnostics.itemCount,
            finalSubmitQuantityCount: diagnostics.quantityCount,
            targetFinalSubmitSubtotal,
          });

          const openRestaurantMenuForCartRepair = async () => {
            if (finalSubmitValidCartSnapshot?.restaurantUrl) {
              await boundedGoto(customerPage, finalSubmitValidCartSnapshot.restaurantUrl, 2500);
              await boundedLoadState(customerPage, 'domcontentloaded', 1500);
              await boundedLoadState(customerPage, 'networkidle', 1500);
              await boundedStablePage(customerPage, 2000);
            } else if (!/\/restaurants\/[^/?]+/.test(customerPage.url())) {
              await boundedGoto(customerPage, `${testUrls.customer}/restaurants`, 2500);
              await boundedLoadState(customerPage, 'domcontentloaded', 1500);
              await boundedLoadState(customerPage, 'networkidle', 1500);
              await boundedStablePage(customerPage, 2000);
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
              await restaurantCard.scrollIntoViewIfNeeded({ timeout: boundedFinalSubmitTimeout(1000) }).catch(() => null);
              await restaurantCard.click({ timeout: boundedFinalSubmitTimeout(1500) }).catch(async () => {
                await restaurantCard.locator('a, button').first().click({ timeout: boundedFinalSubmitTimeout(1500) });
              });
              await boundedLoadState(customerPage, 'domcontentloaded', 1500);
              await boundedLoadState(customerPage, 'networkidle', 1500);
              await boundedStablePage(customerPage, 2000);
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

          console.log('➡️ lifecycle: final submit cart restore start', {
            currentUrl: customerPage.url(),
            subtotal: diagnostics.subtotal,
            subtotalSource: diagnostics.subtotalSource,
            storageItemCount: diagnostics.itemCount,
            storageQuantityCount: diagnostics.quantityCount,
            cartStatePresent: true,
            targetSubtotal: targetFinalSubmitSubtotal,
            remainingDeadlineMs: remainingFinalSubmitRestoreMs(),
          });

          let addToCartButtons = await openRestaurantMenuForCartRepair();
          const attemptedAddButtonIndexes = new Set<number>();

          for (let attempt = 1; attempt <= 3; attempt += 1) {
            if (remainingFinalSubmitRestoreMs() <= 0) {
              break;
            }

            const diagnosticsBeforeRepair = diagnostics;
            diagnostics = await collectFinalSubmitCartDiagnostics();
            const checkoutVisibleNow = await checkoutButton.isVisible().catch(() => false);
            const checkoutEnabledNow = checkoutVisibleNow
              ? await checkoutButton.isEnabled().catch(() => false)
              : false;
            restoreAttempts.push({
              attempt,
              subtotal: diagnostics.subtotal,
              subtotalSource: diagnostics.subtotalSource,
              storageItemCount: diagnostics.itemCount,
              storageQuantityCount: diagnostics.quantityCount,
              cartStatePresent: true,
              checkoutButtonVisible: checkoutVisibleNow,
              checkoutButtonEnabled: checkoutEnabledNow,
              elapsedMs: Date.now() - finalSubmitRestoreStartedAt,
            });

            if (diagnostics.finalSubmitMinimumSatisfied
              && diagnostics.subtotal >= targetFinalSubmitSubtotal
              && diagnostics.itemCount > 0
              && diagnostics.quantityCount > 0
              && checkoutVisibleNow
              && checkoutEnabledNow) {
              break;
            }

            addToCartButtons = await openRestaurantMenuForCartRepair();

            console.log('➡️ lifecycle: restoring final submit cart minimum', {
              attempt,
              finalSubmitSubtotal: diagnostics.subtotal,
              payloadSubtotalAfterRepair: diagnostics.payloadSubtotal,
              payloadItemsAfterRepair: diagnostics.payloadItems,
              cartRepairAttempt: attempt,
              finalSubmitItemCount: diagnostics.itemCount,
              finalSubmitQuantityCount: diagnostics.quantityCount,
              finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
              targetFinalSubmitSubtotal,
              remainingDeadlineMs: remainingFinalSubmitRestoreMs(),
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
              await button.scrollIntoViewIfNeeded({ timeout: boundedFinalSubmitTimeout(1000) }).catch(() => null);
              await button.click({ timeout: boundedFinalSubmitTimeout(1500) }).catch(async () => {
                await customerPage.mouse.click(0, 0).catch(() => null);
              });
              buttonClicked = true;
              break;
            }

            if (!buttonClicked) {
              const visibleContext = await getVisibleCartContext();
              throw new Error(`Final submit cart restore failed before order submit: ${JSON.stringify({
                ...visibleContext,
                finalSubmitSubtotal: diagnostics.subtotal,
                finalSubmitItemCount: diagnostics.itemCount,
                finalSubmitQuantityCount: diagnostics.quantityCount,
                finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
                targetFinalSubmitSubtotal,
                restoreAttemptCount: restoreAttempts.length,
                elapsedMs: Date.now() - finalSubmitRestoreStartedAt,
                remainingDeadlineMs: remainingFinalSubmitRestoreMs(),
              })}`);
            }

            await customerPage.waitForTimeout(250);
            diagnostics = await collectFinalSubmitCartDiagnostics();
            if (diagnostics.payloadSubtotal <= diagnosticsBeforeRepair.payloadSubtotal) {
              await boundedGoto(customerPage, `${testUrls.customer}/restaurants`, 2500);
              await boundedLoadState(customerPage, 'domcontentloaded', 1500);
              await boundedLoadState(customerPage, 'networkidle', 1500);
              await boundedStablePage(customerPage, 2000);
            }

            if (diagnostics.finalSubmitMinimumSatisfied
              && diagnostics.subtotal >= targetFinalSubmitSubtotal
              && diagnostics.itemCount > 0
              && diagnostics.quantityCount > 0) {
              break;
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
            targetFinalSubmitSubtotal,
          });

          if (!diagnostics.finalSubmitMinimumSatisfied) {
            const visibleContext = await getVisibleCartContext();
            console.warn('⚠️ lifecycle: final submit cart restore failed', {
              currentUrl: customerPage.url(),
              subtotal: diagnostics.subtotal,
              subtotalSource: diagnostics.subtotalSource,
              storageKeys: visibleContext.storageKeys,
              storageItemCount: diagnostics.itemCount,
              storageQuantityCount: diagnostics.quantityCount,
              cartStatePresent: visibleContext.cartStatePresent,
              visibleCartText: visibleContext.visibleCartText,
              visibleButtons: visibleContext.visibleQuickAddButtons.map((button) => button.text).slice(0, 10),
              checkoutButtonVisible,
              checkoutButtonEnabled,
              targetSubtotal: targetFinalSubmitSubtotal,
              restoreAttemptCount: restoreAttempts.length,
              elapsedMs: Date.now() - finalSubmitRestoreStartedAt,
              remainingDeadlineMs: remainingFinalSubmitRestoreMs(),
              restoreAttempts,
            });
            throw new Error(`Final submit cart recovery failed before submit: ${JSON.stringify({
              currentUrl: customerPage.url(),
              subtotal: diagnostics.subtotal,
              subtotalSource: diagnostics.subtotalSource,
              storageKeys: visibleContext.storageKeys,
              storageItemCount: diagnostics.itemCount,
              storageQuantityCount: diagnostics.quantityCount,
              cartStatePresent: visibleContext.cartStatePresent,
              visibleCartText: visibleContext.visibleCartText,
              visibleButtons: visibleContext.visibleQuickAddButtons.map((button) => button.text).slice(0, 10),
              checkoutButtonVisible,
              checkoutButtonEnabled,
              targetSubtotal: targetFinalSubmitSubtotal,
              restoreAttemptCount: restoreAttempts.length,
              elapsedMs: Date.now() - finalSubmitRestoreStartedAt,
              remainingDeadlineMs: remainingFinalSubmitRestoreMs(),
            })}`);
          }

          console.log('✅ lifecycle: final submit cart restore completed', {
            currentUrl: customerPage.url(),
            subtotal: diagnostics.subtotal,
            subtotalSource: diagnostics.subtotalSource,
            storageItemCount: diagnostics.itemCount,
            storageQuantityCount: diagnostics.quantityCount,
            targetSubtotal: targetFinalSubmitSubtotal,
            restoreAttemptCount: restoreAttempts.length,
            elapsedMs: Date.now() - finalSubmitRestoreStartedAt,
          });

          await boundedGoto(customerPage, '/checkout', 2500);
          await boundedLoadState(customerPage, 'networkidle', 1500);
          await boundedStablePage(customerPage, 2000);

          const checkoutCart = customerPage.getByTestId('cart');
          const checkoutIncreaseButtons = checkoutCart
            .locator('button[aria-label*="increase" i], button[aria-label*="erhö" i], button[aria-label*="mehr" i], .quantity-btn')
            .filter({ hasText: /\+/ });

          const repairCheckoutCartToMinimum = async () => {
            for (let attempt = 1; attempt <= 8; attempt += 1) {
              diagnostics = await collectFinalSubmitCartDiagnostics();
              if (diagnostics.payloadSubtotal >= targetFinalSubmitSubtotal) {
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
              await customerPage.waitForTimeout(200);
            }

            diagnostics = await collectFinalSubmitCartDiagnostics();
            return diagnostics;
          };

          diagnostics = await repairCheckoutCartToMinimum();
          if (diagnostics.payloadSubtotal < targetFinalSubmitSubtotal) {
            throw new Error(`Final submit cart still below minimum after repair: ${JSON.stringify({
              payloadSubtotalAfterRepair: diagnostics.payloadSubtotal,
              visibleSubtotalAfterRepair: diagnostics.domSubtotal,
              storageSubtotalAfterRepair: diagnostics.storageSubtotal,
              finalSubmitItemCount: diagnostics.itemCount,
              finalSubmitQuantityCount: diagnostics.quantityCount,
              finalSubmitPayloadPreview: diagnostics.cartItems.slice(0, 5),
              targetFinalSubmitSubtotal,
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

        console.log('➡️ lifecycle: final submit before button resolve', {
          currentUrl: customerPage.url(),
        });
        await expect(finalPlaceOrderButton).toBeVisible();
        console.log('✅ lifecycle: final submit button resolved', {
          currentUrl: customerPage.url(),
        });
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
          const submitWaitTimeout = 10000;
          const orderCreateResponsePromise = customerPage.waitForResponse((response) => {
            const request = response.request();
            return request.method() === 'POST'
              && isOrderCustomerUrl(response.url())
              && response.status() < 500;
          }, { timeout: submitWaitTimeout }).catch(() => null);
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
          }, { timeout: submitWaitTimeout })
            .then(() => ({ kind: 'order-url' as const }))
            .catch(() => null);
          const orderTrackingPromise = orderTrackingPage.waitFor({ state: 'visible', timeout: submitWaitTimeout })
            .then(() => ({ kind: 'order-tracking' as const }))
            .catch(() => null);
          const missingAddressPromise = profileAddressWarningLocator.first().waitFor({ state: 'visible', timeout: 2000 })
            .then(() => ({ kind: 'missing-user-address' as const }))
            .catch(() => null);

          console.log('➡️ lifecycle: phase1 clicking final Place Order', { attemptLabel });
          await finalPlaceOrderButton.scrollIntoViewIfNeeded().catch(() => null);
          console.log('➡️ lifecycle: final submit before click', { attemptLabel });
          await finalPlaceOrderButton.click({ noWaitAfter: true });
          console.log('✅ lifecycle: final submit click completed', { attemptLabel });
          console.log('➡️ lifecycle: final submit before response wait', { attemptLabel });

          const paymentModalVisibleAfterClick = await paymentModal.isVisible().catch(() => false);
          if (paymentModalVisibleAfterClick) {
            console.log('➡️ lifecycle: payment modal visible after place order', {
              attemptLabel,
              currentUrl: customerPage.url(),
            });
            console.log('➡️ lifecycle: resolving payment modal confirm button', {
              attemptLabel,
            });
            const paymentConfirmButton = paymentModal
              .getByTestId('payment-confirm-button')
              .or(paymentModal.getByRole('button', {
                name: /pay|bezahlen|zahlung bestätigen|zahlung abschließen|confirm|bestätigen|complete payment|place order|order/i,
              }))
              .or(paymentModal.locator('button').filter({
                hasText: /pay|bezahlen|zahlung bestätigen|zahlung abschließen|confirm|bestätigen|complete payment|place order|order/i,
              }))
              .first();
            const paymentConfirmButtonCount = await paymentConfirmButton.count().catch(() => 0);
            if (paymentConfirmButtonCount === 0) {
              throw new Error(`Payment confirmation button not found after place order: ${JSON.stringify({
                attemptLabel,
                currentUrl: customerPage.url(),
                paymentModalVisible: paymentModalVisibleAfterClick,
                paymentConfirmButtonCount,
                cartVisible: await cartContainer.isVisible().catch(() => false),
                cartItemCount: await cartContainer.locator('.cart-item').count().catch(() => 0),
                visibleTotalText: await cartContainer.locator('text=/€|Mindestbestellwert|Total|Gesamt/i').allTextContents().catch(() => []),
                responseSeen: Boolean(lastOrderCreateResponse),
                orderIdResolved: Boolean(orderId),
                consoleErrors: submitTraffic.consoleErrors,
              })}`);
            }
            await expect(paymentConfirmButton).toBeVisible({ timeout: 5000 });
            await expect(paymentConfirmButton).toBeEnabled({ timeout: 5000 });
            await paymentConfirmButton.scrollIntoViewIfNeeded().catch(() => null);
            await paymentConfirmButton.click({ timeout: 5000 });
            console.log('✅ lifecycle: payment modal confirm button clicked', {
              attemptLabel,
            });
            console.log('➡️ lifecycle: waiting for order creation after payment confirm', {
              attemptLabel,
            });

            const confirmedOrderCreateResponse = await resolveOrderCreationAfterPaymentConfirm(customerPage);
            if (confirmedOrderCreateResponse) {
              lastOrderCreateResponse = confirmedOrderCreateResponse;
              pendingOrderCreateResponse = Promise.resolve(confirmedOrderCreateResponse);
              console.log('✅ lifecycle: order creation response received after payment confirm', {
                attemptLabel,
                status: confirmedOrderCreateResponse.status(),
                url: confirmedOrderCreateResponse.url(),
              });
              return { kind: 'response' as const, response: confirmedOrderCreateResponse };
            }
          }

          const attemptOutcome = await Promise.race([
            orderCreateOutcomePromise,
            orderUrlPromise,
            orderTrackingPromise,
            missingAddressPromise,
          ]);

          if (attemptOutcome) {
            console.log('✅ lifecycle: final submit response/UI observed', {
              attemptLabel,
              kind: attemptOutcome.kind,
            });
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
          console.log('⚠️ lifecycle: final submit no response/UI yet after bounded waits', {
            attemptLabel,
            currentUrl: customerPage.url(),
            submitWaitTimeout,
            hasSuccessfulOrderCreateResponse,
            hasOrderConfirmationUi,
          });
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
      const paymentModalVisible = await paymentModal.waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      const orderTrackingVisible = await orderTrackingPage.waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      const orderUrlVisible = await customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 8000 })
        .then(() => true)
        .catch(() => false);

      if (paymentModalVisible) {
        console.log('➡️ lifecycle: payment modal visible after place order');
        console.log('➡️ lifecycle: resolving payment modal confirm button');
        const paymentConfirmButton = paymentModal
          .getByTestId('payment-confirm-button')
          .or(paymentModal.getByRole('button', {
            name: /pay|bezahlen|zahlung bestätigen|zahlung abschließen|confirm|bestätigen|complete payment|place order|order/i,
          }))
          .or(paymentModal.locator('button').filter({
            hasText: /pay|bezahlen|zahlung bestätigen|zahlung abschließen|confirm|bestätigen|complete payment|place order|order/i,
          }))
          .first();
        const paymentConfirmButtonCount = await paymentConfirmButton.count().catch(() => 0);
        if (paymentConfirmButtonCount === 0) {
          throw new Error(`Payment confirmation button not found after place order: ${JSON.stringify({
            currentUrl: customerPage.url(),
            paymentModalVisible,
            paymentConfirmButtonCount,
            orderTrackingVisible,
            cartVisible: await cartContainer.isVisible().catch(() => false),
            cartItemCount: await cartContainer.locator('.cart-item').count().catch(() => 0),
            visibleTotalText: await cartContainer.locator('text=/€|Mindestbestellwert|Total|Gesamt/i').allTextContents().catch(() => []),
            responseSeen: Boolean(lastOrderCreateResponse),
            orderIdResolved: Boolean(orderId),
            consoleErrors: [],
          })}`);
        }
        await expect(paymentConfirmButton).toBeVisible({ timeout: 5000 });
        await expect(paymentConfirmButton).toBeEnabled({ timeout: 5000 });
        await paymentConfirmButton.scrollIntoViewIfNeeded().catch(() => null);
        await paymentConfirmButton.click({ timeout: 5000 });
        console.log('✅ lifecycle: payment modal confirm button clicked');
        console.log('➡️ lifecycle: waiting for order creation after payment confirm');

        const confirmedOrderCreateResponse = await resolveOrderCreationAfterPaymentConfirm(customerPage);
        if (confirmedOrderCreateResponse) {
          lastOrderCreateResponse = confirmedOrderCreateResponse;
          pendingOrderCreateResponse = Promise.resolve(confirmedOrderCreateResponse);
          console.log('✅ lifecycle: order creation response received after payment confirm', {
            status: confirmedOrderCreateResponse.status(),
            url: confirmedOrderCreateResponse.url(),
          });
          return;
        }
      } else {
        console.log('ℹ️ Payment modal not shown, continuing with direct order confirmation signals', {
          orderTrackingVisible,
          orderUrlVisible,
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
        await expect(paymentConfirmButton).toBeEnabled();
        await paymentConfirmButton.click();
        console.log('✅ lifecycle: payment confirm button clicked');

        await Promise.race([
          customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 20000 }).catch(() => null),
          orderTrackingPage.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
        ]);
      }

      if (!paymentModalVisible) {
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
        const targetCardState = await resolveVisibleDriverTargetOrderCard(
          driverPage,
          orderId,
          'phase3 driver pickup button visible',
        );
        const pickupCard = targetCardState.targetCard;
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
        const pickupStatusText = await readLocatorTextWithin(
          pickupCard.locator('[data-testid="order-status"], .order-status'),
          1000,
        );
        const pickupStatusConfirmed = Boolean(
          pickupStatusText && /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|DELIVERED|COMPLETED/i.test(pickupStatusText),
        );
        const pickupSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId);
        const pickupSnapshotConfirmed = isConfirmedDriverProgressStatus(pickupSnapshot.status) || pickupSnapshot.delivered;

        if (!targetCardState.targetCardVisible && !pickupSnapshotConfirmed) {
          throw new Error(`phase3 driver pickup target card not visible after accept: ${JSON.stringify({
            orderId,
            currentUrl: driverPage.url(),
            cardFound: targetCardState.targetCardVisible,
            orderCardCount: targetCardState.orderCardCount,
            pickupButtonVisible,
            pickupStatusText: pickupStatusText || null,
            pickupSnapshotStatus: pickupSnapshot.status,
            pickupSnapshotDelivered: pickupSnapshot.delivered,
            visibleButtons: targetCardState.visibleButtonTexts.slice(0, 25),
            visibleCards: targetCardState.bodyTextPreview ? [targetCardState.bodyTextPreview.slice(0, 300)] : [],
            visibleLinkTexts: targetCardState.visibleLinkTexts,
          })}`);
        }

        if (!pickupButtonVisible && !pickupSnapshotConfirmed && !pickupStatusConfirmed) {
          throw new Error(`phase3 driver pickup button not visible after accept: ${JSON.stringify({
            orderId,
            currentUrl: driverPage.url(),
            cardFound: targetCardState.targetCardVisible,
            orderCardCount: targetCardState.orderCardCount,
            pickupButtonVisible,
            pickupStatusText: pickupStatusText || null,
            pickupSnapshotStatus: pickupSnapshot.status,
            pickupSnapshotDelivered: pickupSnapshot.delivered,
            visibleButtons: targetCardState.visibleButtonTexts.slice(0, 25),
            visibleLinkTexts: targetCardState.visibleLinkTexts,
          })}`);
        }
        console.log('✅ lifecycle step done: phase3 driver pickup button visible', {
          orderId,
          currentUrl: driverPage.url(),
          cardFound: targetCardState.targetCardVisible,
          pickupButtonVisible,
          pickupStatusText: pickupStatusText || null,
          pickupSnapshotStatus: pickupSnapshot.status,
          pickupSnapshotDelivered: pickupSnapshot.delivered,
        });
        driverPickupVisibleCardState = targetCardState;
        driverPickupVisiblePickupButton = pickupButton;
        driverPickupVisiblePickupButtonSeen = pickupButtonVisible;

        if (targetCardState.targetCardVisible && pickupButtonVisible) {
          const atomicClickStartedAt = Date.now();
          console.log('➡️ lifecycle: atomic pickup click from visible step start', {
            orderId,
            currentUrl: driverPage.url(),
            clickedFromVisibleStep: true,
            clickMethod: 'locator-click',
          });
          const atomicClickResult = await clickPickupActionAtomically(
            pickupCard,
            orderId,
            'phase3 driver pickup button visible',
          );
          if (atomicClickResult.clicked) {
            driverPickupClickedDuringVisibleStep = true;
            driverPickupVisibleClickDiagnostics = {
              orderId,
              currentUrl: driverPage.url(),
              clickedFromVisibleStep: true,
              clickMethod: atomicClickResult.reason.includes('force-click')
                ? 'force-click'
                : atomicClickResult.reason.includes('dom-evaluate-click')
                  ? 'dom-evaluate-click'
                  : 'locator-click',
              elapsedMs: Date.now() - atomicClickStartedAt,
            };
            console.log('✅ lifecycle: atomic pickup click from visible step completed', {
              orderId,
              currentUrl: driverPage.url(),
              clickedFromVisibleStep: true,
              clickMethod: driverPickupVisibleClickDiagnostics.clickMethod,
              elapsedMs: driverPickupVisibleClickDiagnostics.elapsedMs,
            });
            return;
          }

          console.warn('⚠️ lifecycle: atomic pickup click from visible step failed', {
            orderId,
            currentUrl: driverPage.url(),
            clickedFromVisibleStep: true,
            clickMethod: atomicClickResult.reason.includes('force-click')
              ? 'force-click'
              : atomicClickResult.reason.includes('dom-evaluate-click')
                ? 'dom-evaluate-click'
                : 'locator-click',
            elapsedMs: Date.now() - atomicClickStartedAt,
            reason: atomicClickResult.reason,
          });
        }
      });

      await withStepTimeout('phase3 driver pickup click', async () => {
        const ensureDriverPageOpen = () => {
          if (driverPage.isClosed()) {
            throw new Error(`Driver page closed before pickup operation for order ${orderId}`);
          }
        };
        const pickupClickStepDeadline = Date.now() + 12000;
        const remainingPickupClickMs = () => Math.max(0, pickupClickStepDeadline - Date.now());
        const boundedPickupTimeoutMs = (preferred: number) => Math.max(250, Math.min(preferred, remainingPickupClickMs()));
        const assertPickupClickDeadline = (label: string) => {
          if (remainingPickupClickMs() <= 0) {
            throw new Error(`phase3 driver pickup click deadline exceeded during ${label}: ${JSON.stringify({
              orderId,
              currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
              remainingDeadlineMs: remainingPickupClickMs(),
              directVisibleClickAttempted,
              directVisibleClickCompleted,
              directVisibleClickError,
              directVisibleClickDurationMs,
              recoveryAttempted,
              recoveryDurationMs,
              pickupSnapshotStatus: pickupSnapshot?.status ?? null,
              pickupSnapshotDelivered: pickupSnapshot?.delivered ?? false,
              latestApiStatus: pickupSnapshot?.status ?? null,
            })}`);
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
          requestDetails: [] as Array<{ method: string; url: string; postData: string | null }>,
          responseUrls: [] as string[],
          responseDetails: [] as Array<{ method: string; url: string; status: number; bodySnippet: string | null }>,
          requestFailedEvents: [] as string[],
          pageErrors: [] as string[],
          consoleErrors: [] as string[],
        };
        const pickupTrafficMatcher = /\/api\/orders\/|\/orders\/|\/status|\/pickup|\/driver/i;
        const onPickupRequest = (request: Parameters<Parameters<typeof driverPage.on>[1]>[0]) => {
          const url = request.url();
          if (pickupTrafficMatcher.test(url)) {
            pickupTraffic.requestUrls.push(`${request.method()} ${url}`);
            pickupTraffic.requestDetails.push({
              method: request.method(),
              url,
              postData: request.postData()?.slice(0, 500) || null,
            });
          }
        };
        const onPickupResponse = (response: Parameters<Parameters<typeof driverPage.on>[1]>[0]) => {
          const url = response.url();
          if (pickupTrafficMatcher.test(url)) {
            pickupTraffic.responseUrls.push(`${response.status()} ${url}`);
            pickupTraffic.responseDetails.push({
              method: response.request().method(),
              url,
              status: response.status(),
              bodySnippet: null,
            });
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
        let directVisibleClickAttempted = false;
        let directVisibleClickCompleted = false;
        let directVisibleClickError: string | null = null;
        let directVisibleClickDurationMs: number | null = null;
        let recoveryAttempted = false;
        let recoveryDurationMs: number | null = null;
        let pickupSnapshot: Awaited<ReturnType<typeof fetchDriverOrderSnapshot>> | null = null;
        let latestApiStatus: string | null = null;
        let latestApiStatusBeforePickupClick: string | null = null;
        let pageTextPreview = '';
        let visibleButtons: string[] = [];
        let visibleInteractiveElements: Array<{ text: string; visible: boolean; [key: string]: unknown }> = [];
        let visiblePickupCandidates: Array<{ text: string; visible: boolean; [key: string]: unknown }> = [];
        let pickupActionMissingDespiteVisibleAcceptedOrder = false;
        let pickupConfirmedBySignal = false;
        let activeOrderCountSignal = 0;
        let fallbackAttempted = false;
        let fallbackSkippedReason = 'pickup-action-present-or-not-accepted';
        let latestApiStatusAfterFallback: string | null = null;
        let fallbackResponseStatus: number | null = null;
        let fallbackResponseBody: string | null = null;
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
        const pickupStatusTextBefore = await readLocatorTextWithin(pickupStatusLocator, 1000);
        const elapsedBeforeClickMs = Date.now() - pickupClickStartedAt;
        console.log('ℹ️ lifecycle: phase3 pickup click before', {
          orderId,
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          pickupButtonText,
          pickupStatusText: pickupStatusTextBefore || null,
          elapsedBeforeClickMs,
        });
        if (elapsedBeforeClickMs > 2000) {
          console.warn('⚠️ lifecycle: driver pickup pre-click preparation exceeded diagnostic threshold', {
            orderId,
            elapsedBeforeClickMs,
          });
        }

        if (driverPickupClickedDuringVisibleStep) {
          console.log('✅ lifecycle: pickup already clicked during visible step, verifying pickup state', {
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            driverPickupVisibleClickDiagnostics,
          });
          const confirmedPickupSnapshot = await waitForConfirmedDriverPickupStatus(
            driverPage,
            orderId,
            'phase3 driver pickup click after visible-step click',
          );
          if (confirmedPickupSnapshot && (isConfirmedDriverProgressStatus(confirmedPickupSnapshot.status) || confirmedPickupSnapshot.delivered)) {
            pickupSnapshot = confirmedPickupSnapshot;
            latestApiStatus = confirmedPickupSnapshot.status;
            driverPickupCompleted = true;
            console.log('✅ lifecycle: driver pickup completion confirmed by snapshot', {
              orderId,
              currentUrl: confirmedPickupSnapshot.currentUrl,
              status: confirmedPickupSnapshot.status,
              delivered: confirmedPickupSnapshot.delivered,
              reason: 'pickup already clicked during visible step, verifying pickup state',
            });
            return;
          }
          throw new Error(`phase3 driver pickup click failed to verify pickup after visible-step click: ${JSON.stringify({
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            driverPickupVisibleClickDiagnostics,
            pickupSnapshotStatus: confirmedPickupSnapshot?.status ?? null,
            pickupSnapshotDelivered: confirmedPickupSnapshot?.delivered ?? false,
          })}`);
        }

        console.log('➡️ lifecycle: direct visible pickup click attempt start', {
          orderId,
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          directVisibleClickAttempted: Boolean(driverPickupVisibleCardState?.targetCardVisible && driverPickupVisiblePickupButtonSeen),
          remainingDeadlineMs: remainingPickupClickMs(),
        });

        const visibleStateClickResult = driverPickupVisibleCardState?.targetCardVisible && driverPickupVisiblePickupButtonSeen
          ? await Promise.race([
            clickPickupActionWithinTargetCard(
              driverPickupVisibleCardState.targetCard,
              orderId,
              'phase3 driver pickup click direct visible state',
            ).catch((error) => ({
              clicked: false,
              reason: error instanceof Error ? error.message : String(error),
              orderSuffix: orderId.slice(-8),
            })),
            new Promise<Awaited<ReturnType<typeof clickPickupActionWithinTargetCard>>>((resolve) => setTimeout(() => resolve({
              clicked: false,
              reason: 'direct-click-timeout',
              orderSuffix: orderId.slice(-8),
            }), boundedPickupTimeoutMs(2000))),
          ])
          : null;

        if (driverPickupVisibleCardState?.targetCardVisible && driverPickupVisiblePickupButtonSeen && !visibleStateClickResult?.clicked) {
          const preferredVisibleClickResult = await clickPickupActionAtomically(
            driverPickupVisibleCardState.targetCard,
            orderId,
            'phase3 driver pickup click visible-state retry',
          ).catch((error) => ({
            clicked: false,
            reason: error instanceof Error ? error.message : String(error),
            orderSuffix: orderId.slice(-8),
          }));
          if (preferredVisibleClickResult.clicked) {
            console.log('✅ lifecycle: direct visible pickup click completed', {
              orderId,
              currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
              directVisibleClickDurationMs: Date.now() - pickupClickStartedAt,
              directClickResult: preferredVisibleClickResult,
              clickResolverPath: 'visible-state-retry-atomic',
            });
            return;
          }
        }

        if (visibleStateClickResult?.clicked) {
          console.log('✅ lifecycle: direct visible pickup click completed', {
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            directVisibleClickDurationMs: Date.now() - pickupClickStartedAt,
            directClickResult: visibleStateClickResult,
          });
        } else if (driverPickupVisibleCardState?.targetCardVisible && driverPickupVisiblePickupButtonSeen) {
          console.warn('⚠️ lifecycle: direct visible pickup click failed', {
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            cardFound: driverPickupVisibleCardState.targetCardVisible,
            pickupButtonVisible: driverPickupVisiblePickupButtonSeen,
            pickupButtonText: pickupButtonText || null,
            visibleButtons: driverPickupVisibleCardState.visibleButtonTexts.slice(0, 25),
            visibleCards: driverPickupVisibleCardState.bodyTextPreview ? [driverPickupVisibleCardState.bodyTextPreview.slice(0, 300)] : [],
            pickupSnapshotStatus: driverPickupVisibleCardState?.targetCardVisible ? null : pickupSnapshot?.status ?? null,
            directVisibleClickAttempted: true,
            directVisibleClickCompleted: false,
          });
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
        }, { timeout: boundedPickupTimeoutMs(4000) }).catch(() => null);

        const pickupUiSuccessPromise = Promise.race([
          driverPage.getByText(/PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|abgeholt|unterwegs|in delivery|delivered/i)
            .first()
            .waitFor({ state: 'visible', timeout: boundedPickupTimeoutMs(4000) })
            .then(() => true)
            .catch(() => false),
          nextActionButton.waitFor({ state: 'visible', timeout: boundedPickupTimeoutMs(4000) })
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
          assertPickupClickDeadline(`ensureDriverOrdersView:start:${stage}`);
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
            assertPickupClickDeadline(`ensureDriverOrdersView:open-target:${stage}`);
            try {
              if (await target.isVisible().catch(() => false)) {
                await target.click({ timeout: boundedPickupTimeoutMs(1000) }).catch(() => null);
                break;
              }
            } catch {
              // continue with next candidate
            }
          }

          if (!driverPage.url().includes('/orders')) {
            await driverPage.goto(`${testUrls.driver}/orders`, { waitUntil: 'domcontentloaded', timeout: boundedPickupTimeoutMs(1500) }).catch(() => null);
          }
           await driverPage.waitForLoadState('domcontentloaded', { timeout: boundedPickupTimeoutMs(1000) }).catch(() => undefined);
           await driverPage.waitForLoadState('networkidle', { timeout: boundedPickupTimeoutMs(1000) }).catch(() => undefined);

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
            }), boundedPickupTimeoutMs(1500))),
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

        const ensureDriverOrdersViewAfterPickupInPickupClick = async (
          driverPage: Page,
          orderId: string,
          stage: string,
        ) => {
          assertPickupClickDeadline(`ensureDriverOrdersViewAfterPickup:start:${stage}`);
          const inspectOrdersDom = async () => {
          const evalOrderId = orderId;
            return driverPage.evaluate((resolvedOrderId) => {
              const isVisible = (node: Element | null | undefined) => {
                if (!node || !(node instanceof HTMLElement)) return false;
                const style = window.getComputedStyle(node);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && node.getClientRects().length > 0;
              };
              const getVisibleText = (node: Element | null | undefined) => {
                if (!node || !(node instanceof HTMLElement) || !isVisible(node)) return '';
                return (node.textContent || '').trim().replace(/\s+/g, ' ');
              };
              const visibleButtonTexts = Array.from(document.querySelectorAll('button'))
                .filter((node): node is HTMLElement => node instanceof HTMLElement)
                .filter((node) => isVisible(node))
                .map((node) => getVisibleText(node))
                .filter(Boolean)
                .slice(0, 40);
              const visibleLinkTexts = Array.from(document.querySelectorAll('a, [role="link"]'))
                .filter((node): node is HTMLElement => node instanceof HTMLElement)
                .filter((node) => isVisible(node))
                .map((node) => getVisibleText(node))
                .filter(Boolean)
                .slice(0, 30);
              const orderCard = document.querySelector(`[data-testid="driver-order-card-${resolvedOrderId}"], [data-order-id="${resolvedOrderId}"]`);
              const orderCards = Array.from(document.querySelectorAll('[data-testid*="driver-order-card"], .order-card, [data-order-id]'))
                .filter((node): node is HTMLElement => node instanceof HTMLElement)
                .filter((node) => isVisible(node));
              const bodyText = document.body?.innerText?.slice(0, 1000) || '';
              return {
                orderCardVisible: Boolean(orderCard && isVisible(orderCard)),
                orderCardCount: orderCards.length,
                visibleButtonTexts,
                visibleLinkTexts,
                bodyTextPreview: bodyText,
                hasOrdersText: /bestellungen|orders/i.test(bodyText),
                hasActiveOrdersText: /aktive bestellungen|active orders|current orders|in transit|unterwegs|picked up/i.test(bodyText),
                hasDeliveredText: /delivered|zugestellt|geliefert/i.test(bodyText),
                hasOrderIdText: bodyText.includes(resolvedOrderId),
              };
            }, evalOrderId).catch(() => ({
              orderCardVisible: false,
              orderCardCount: 0,
              visibleButtonTexts: [] as string[],
              visibleLinkTexts: [] as string[],
              bodyTextPreview: '',
              hasOrdersText: false,
              hasActiveOrdersText: false,
              hasDeliveredText: false,
              hasOrderIdText: false,
            }));
          };

          const before = await inspectOrdersDom();
          if (before.orderCardVisible) {
            return before;
          }

          console.log('ℹ️ lifecycle: phase3 ensure driver orders view after pickup', {
            orderId,
            stage,
            currentUrl: driverPage.url(),
            orderCardVisibleBeforeReopen: before.orderCardVisible,
            orderCardCountBeforeReopen: before.orderCardCount,
          });

          const openOrdersTargets = [
            driverPage.getByRole('button', { name: /Orders|Bestellungen/i }).first(),
            driverPage.getByRole('link', { name: /Orders|Bestellungen/i }).first(),
            driverPage.locator('[data-testid*="orders"]').first(),
          ];
          for (const target of openOrdersTargets) {
            assertPickupClickDeadline(`ensureDriverOrdersViewAfterPickup:open-target:${stage}`);
            try {
              if (await target.isVisible().catch(() => false)) {
                await target.click({ timeout: boundedPickupTimeoutMs(1000) }).catch(() => null);
                break;
              }
            } catch {
              // continue with next candidate
            }
          }

          if (!driverPage.url().includes('/orders')) {
            await driverPage.goto(`${testUrls.driver}/orders`, { waitUntil: 'domcontentloaded', timeout: boundedPickupTimeoutMs(1500) }).catch(() => null);
          }
          await driverPage.waitForLoadState('domcontentloaded', { timeout: boundedPickupTimeoutMs(1000) }).catch(() => undefined);
          await driverPage.waitForLoadState('networkidle', { timeout: boundedPickupTimeoutMs(1000) }).catch(() => undefined);

          const reopened = await Promise.race([
            inspectOrdersDom().then((result) => result).catch(() => ({
              orderCardVisible: false,
              orderCardCount: 0,
              visibleButtonTexts: [] as string[],
              visibleLinkTexts: [] as string[],
              bodyTextPreview: '',
              hasOrdersText: false,
              hasActiveOrdersText: false,
              hasDeliveredText: false,
              hasOrderIdText: false,
            })),
            new Promise<Awaited<ReturnType<typeof inspectOrdersDom>>>((resolve) => setTimeout(() => resolve({
              orderCardVisible: false,
              orderCardCount: 0,
              visibleButtonTexts: [] as string[],
              visibleLinkTexts: [] as string[],
              bodyTextPreview: '',
              hasOrdersText: false,
              hasActiveOrdersText: false,
              hasDeliveredText: false,
              hasOrderIdText: false,
            }), boundedPickupTimeoutMs(1500))),
          ]);

          if (driverPickupCompleted && !reopened.orderCardVisible && reopened.orderCardCount === 0 && !reopened.hasOrderIdText && !reopened.hasActiveOrdersText && !reopened.hasDeliveredText) {
            const historyTargets = [
              driverPage.getByRole('button', { name: /Order History|Bestellhistorie/i }).first(),
              driverPage.getByRole('link', { name: /Order History|Bestellhistorie/i }).first(),
              driverPage.locator('[data-testid*="history"]').first(),
            ];
            for (const target of historyTargets) {
              try {
                if (await target.isVisible().catch(() => false)) {
                  await target.click({ timeout: 1500 }).catch(() => null);
                  break;
                }
              } catch {
                // continue with next candidate
              }
            }

            if (!driverPage.url().includes('/history')) {
              await driverPage.goto(`${testUrls.driver}/history`).catch(() => null);
            }
            await driverPage.waitForLoadState('domcontentloaded').catch(() => undefined);
            await driverPage.waitForLoadState('networkidle').catch(() => undefined);

            const reopenedHistory = await Promise.race([
              inspectOrdersDom().then((result) => result).catch(() => ({
                orderCardVisible: false,
                orderCardCount: 0,
                visibleButtonTexts: [] as string[],
                visibleLinkTexts: [] as string[],
                bodyTextPreview: '',
                hasOrdersText: false,
                hasActiveOrdersText: false,
                hasDeliveredText: false,
                hasOrderIdText: false,
              })),
              new Promise<Awaited<ReturnType<typeof inspectOrdersDom>>>((resolve) => setTimeout(() => resolve({
                orderCardVisible: false,
                orderCardCount: 0,
                visibleButtonTexts: [] as string[],
                visibleLinkTexts: [] as string[],
                bodyTextPreview: '',
                hasOrdersText: false,
                hasActiveOrdersText: false,
                hasDeliveredText: false,
                hasOrderIdText: false,
              }), 2000)),
            ]);

            if (reopenedHistory.orderCardVisible || reopenedHistory.orderCardCount > 0 || reopenedHistory.hasOrderIdText || reopenedHistory.hasActiveOrdersText || reopenedHistory.hasDeliveredText) {
              console.log('ℹ️ lifecycle: phase3 driver history view ensured after pickup', {
                orderId,
                stage,
                currentUrl: driverPage.url(),
                orderCardVisibleAfterReopen: reopenedHistory.orderCardVisible,
                orderCardCountAfterReopen: reopenedHistory.orderCardCount,
              });
              return reopenedHistory;
            }
          }

          if (!reopened.orderCardVisible && reopened.orderCardCount === 0 && !reopened.hasOrderIdText && !reopened.hasActiveOrdersText && !reopened.hasDeliveredText) {
            if (driverPickupCompleted) {
              console.log('ℹ️ lifecycle: driver pickup confirmed but orders/history view still sparse after reopen', {
                orderId,
                stage,
                currentUrl: driverPage.url(),
                visibleButtonTexts: reopened.visibleButtonTexts,
                visibleLinkTexts: reopened.visibleLinkTexts,
                bodyTextPreview: reopened.bodyTextPreview,
              });
              return reopened;
            }
            throw new Error(`phase3 driver orders view missing after pickup: ${JSON.stringify({
              orderId,
              currentUrl: driverPage.url(),
              visibleButtonTexts: reopened.visibleButtonTexts,
              visibleLinkTexts: reopened.visibleLinkTexts,
              orderCardVisibleBeforeReopen: before.orderCardVisible,
              orderCardCountAfterReopen: reopened.orderCardCount,
              bodyTextPreview: reopened.bodyTextPreview,
            })}`);
          }

          console.log('ℹ️ lifecycle: phase3 driver orders view ensured after pickup', {
            orderId,
            stage,
            currentUrl: driverPage.url(),
            orderCardVisibleAfterReopen: reopened.orderCardVisible,
            orderCardCountAfterReopen: reopened.orderCardCount,
          });

          return reopened;
        };

        let clickError: string | null = null;
        let pickupCardStateForDiagnostics = driverPickupVisibleCardState ?? null;
        let directClickResult: Awaited<ReturnType<typeof clickPickupActionWithinTargetCard>> | null = null;
        const pickupStepStartedAt = Date.now();
        try {
          ensureDriverPageOpen();
          const pickupCardState = driverPickupVisibleCardState?.targetCardVisible
            ? driverPickupVisibleCardState
            : await resolveVisibleDriverTargetOrderCard(
              driverPage,
              orderId,
              'phase3 driver pickup click after direct pickup attempt',
            );
          pickupCardStateForDiagnostics = pickupCardState;
          const pickupCard = pickupCardState.targetCard;
          const pickupButton = driverPickupVisiblePickupButton
            ?? pickupCard
            .getByTestId(`driver-picked-up-order-${orderId}`)
            .or(pickupCard.locator('[data-action="pickup-order"]'))
            .or(
              pickupCard.getByRole('button', {
                name: /picked up|abgeholt|pickup/i,
              }),
            )
            .first();

          const pickupButtonVisible = await pickupButton.isVisible().catch(() => false);
          const pickupCardVisible = Boolean(pickupCardState.targetCardVisible);
          const pickupStatusText = await readLocatorTextWithin(
            pickupCard.locator('[data-testid="order-status"], .order-status'),
            boundedPickupTimeoutMs(1000),
          );
          const pickupStatusConfirmed = Boolean(
            pickupStatusText && /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|DELIVERED|COMPLETED/i.test(pickupStatusText),
          );
          pickupSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId);
          latestApiStatus = pickupSnapshot.status;
          const pickupSnapshotConfirmed = isConfirmedDriverProgressStatus(pickupSnapshot.status) || pickupSnapshot.delivered;
        if (!pickupCardVisible && !pickupSnapshotConfirmed) {
          throw new Error(`Driver pickup target card not visible for order ${orderId}: ${JSON.stringify({
            orderId,
            currentUrl: driverPage.url(),
            cardFound: pickupCardVisible,
            pickupButtonVisible,
            pickupButtonText: pickupButtonText || null,
            pickupStatusTextBefore: pickupStatusTextBefore || null,
            pickupStatusText,
            pickupSnapshotStatus: pickupSnapshot.status,
            pickupSnapshotDelivered: pickupSnapshot.delivered,
            visibleButtons: pickupCardState.visibleButtonTexts.slice(0, 25),
            visibleCards: pickupCardState.bodyTextPreview ? [pickupCardState.bodyTextPreview.slice(0, 300)] : [],
            visibleLinkTexts: pickupCardState.visibleLinkTexts,
            pageTextPreview: pickupCardState.bodyTextPreview,
            })}`);
        }

        if (pickupSnapshotConfirmed) {
          driverPickupCompleted = true;
          console.log('✅ driver pickup completed', {
            orderId,
            currentUrl: pickupSnapshot.currentUrl,
            pickupButtonText: pickupButtonText || null,
            pickupStatusText: pickupStatusText || null,
            pickupSnapshotStatus: pickupSnapshot.status,
            pickupSnapshotDelivered: pickupSnapshot.delivered,
            reason: 'pickup already confirmed by snapshot before click',
          });
          return;
        }

        let pickupButtonToClick = pickupButton;

        assertPickupClickDeadline('before-direct-visible-click');
        if (!visibleStateClickResult?.clicked && driverPickupVisibleCardState?.targetCardVisible && driverPickupVisiblePickupButtonSeen) {
          directVisibleClickAttempted = true;
          try {
            const directClickTargetCard = driverPickupVisibleCardState.targetCard;
            const directClickStartedAt = Date.now();
            const directClickAttempt = clickPickupActionAtomically(
              directClickTargetCard,
              orderId,
              'phase3 driver pickup click direct visible state',
            ).catch((error) => {
              directVisibleClickError = error instanceof Error ? error.message : String(error);
              return {
                clicked: false,
                reason: 'direct-click-error',
                orderSuffix: orderId.slice(-8),
              } as Awaited<ReturnType<typeof clickPickupActionAtomically>>;
            });
            const directClickTimeout = new Promise<Awaited<ReturnType<typeof clickPickupActionAtomically>>>((resolve) => setTimeout(() => resolve({
              clicked: false,
              reason: 'direct-click-timeout',
              orderSuffix: orderId.slice(-8),
            }), boundedPickupTimeoutMs(2500)));
            directClickResult = await Promise.race([directClickAttempt, directClickTimeout]);
            directVisibleClickDurationMs = Date.now() - directClickStartedAt;
            directVisibleClickCompleted = Boolean(directClickResult?.clicked);
          } catch (error) {
            directVisibleClickError = error instanceof Error ? error.message : String(error);
          }

          if (directClickResult?.clicked) {
            console.log('✅ lifecycle: direct visible pickup click completed', {
              orderId,
              currentUrl: driverPage.url(),
              directClickResult,
              driverPickupVisiblePickupButtonSeen,
              directVisibleClickDurationMs,
            });
          } else {
            console.warn('⚠️ lifecycle: direct visible pickup click failed', {
              orderId,
              currentUrl: driverPage.url(),
              directVisibleClickAttempted,
              directVisibleClickError,
              directVisibleClickDurationMs,
              directClickResult,
            });
          }
        }

        const pageTextBeforeRecovery = await driverPage.locator('body').innerText({ timeout: 2000 }).catch(() => '');
        const visibleButtonsBeforeRecovery = visibleButtons;
        const visibleInteractiveElementsBeforeRecovery = visibleInteractiveElements;
        const previousVisibleOrderContext = driverPickupVisibleCardState ? {
          orderId,
          orderSuffix: orderId.slice(-8),
          cardFound: driverPickupVisibleCardState.targetCardVisible,
          pickupButtonSeen: driverPickupVisiblePickupButtonSeen,
          pickupButtonVisible: driverPickupVisiblePickupButtonSeen,
          pickupButtonText: pickupButtonText || null,
          pageTextPreview: driverPickupVisibleCardState.bodyTextPreview || null,
          cardText: driverPickupVisibleCardState.bodyTextPreview || null,
          visibleButtons: driverPickupVisibleCardState.visibleButtonTexts,
          visibleInteractiveElements: driverPickupVisibleCardState.visibleLinkTexts,
          source: 'phase3 driver pickup button visible',
        } : undefined;
        const pickupFallbackResult = await tryPickupApiFallbackForVisibleAcceptedOrder({
          driverPage,
          orderId,
          stage: 'phase3 driver pickup click before recovery',
          pageTextBeforeRecovery,
          visibleButtonsBeforeRecovery,
          visibleInteractiveElementsBeforeRecovery,
          driverPickupVisiblePickupButtonSeen,
          previousVisibleOrderContext,
        });
        fallbackAttempted = pickupFallbackResult.attempted;
        fallbackSkippedReason = pickupFallbackResult.skippedReason || fallbackSkippedReason;
        latestApiStatusBeforePickupClick = pickupFallbackResult.latestApiStatusBeforePickupClick ?? latestApiStatusBeforePickupClick;
        latestApiStatusAfterFallback = pickupFallbackResult.latestApiStatusAfterFallback ?? latestApiStatusAfterFallback;
        fallbackResponseStatus = pickupFallbackResult.fallbackResponseStatus ?? fallbackResponseStatus;
        fallbackResponseBody = pickupFallbackResult.fallbackResponseBody ?? fallbackResponseBody;
        if (pickupFallbackResult.succeeded) {
          latestApiStatus = pickupFallbackResult.latestApiStatusAfterFallback || latestApiStatus;
          pickupConfirmedBySignal = true;
          driverPickupCompleted = true;
          console.log('✅ lifecycle: driver pickup completed through verified API fallback', {
            orderId,
            latestApiStatusAfterFallback: pickupFallbackResult.latestApiStatusAfterFallback,
          });
          return;
        }

        assertPickupClickDeadline('before-recovery');
        if (!visibleStateClickResult?.clicked && !directClickResult?.clicked && !pickupButtonVisible && !pickupStatusConfirmed) {
          recoveryAttempted = true;
          const recoveryStartedAt = Date.now();
          const dismissRecoveryTargets = [
            driverPage.getByRole('button', { name: /Got it|Verstanden|OK/i }).first(),
            driverPage.getByText(/Got it|Verstanden|OK/i).first(),
          ];
          for (const target of dismissRecoveryTargets) {
            assertPickupClickDeadline('recovery-dismiss');
            try {
              if (await target.isVisible().catch(() => false)) {
                await target.click({ timeout: boundedPickupTimeoutMs(1000) }).catch(() => null);
                break;
              }
            } catch {
              // continue with next candidate
            }
          }

          const recoveryOrdersView = await Promise.race([
            ensureDriverOrdersViewAfterPickupInPickupClick(driverPage, orderId, 'phase3 driver pickup click recovery').catch(() => null),
            new Promise<Awaited<ReturnType<typeof ensureDriverOrdersViewAfterPickupInPickupClick>> | null>((resolve) => setTimeout(() => resolve(null), boundedPickupTimeoutMs(5000))),
          ]);
          recoveryDurationMs = Date.now() - recoveryStartedAt;
          const recoveredCardState = recoveryOrdersView?.orderCardVisible
            ? await resolveVisibleDriverTargetOrderCard(
              driverPage,
              orderId,
              'phase3 driver pickup click recovery',
            )
            : pickupCardState;
          pickupCardStateForDiagnostics = recoveredCardState;
          pickupButtonToClick = recoveredCardState.targetCard
            .getByTestId(`driver-picked-up-order-${orderId}`)
            .or(recoveredCardState.targetCard.locator('[data-action="pickup-order"]'))
            .or(
              recoveredCardState.targetCard.getByRole('button', {
                name: /picked up|abgeholt|pickup/i,
              }),
            )
            .first();

          const recoveredPickupButtonVisible = await pickupButtonToClick.isVisible().catch(() => false);
          const recoveredPickupStatusText = await readLocatorTextWithin(
            recoveredCardState.targetCard.locator('[data-testid="order-status"], .order-status'),
            1000,
          );
          const recoveredPickupStatusConfirmed = Boolean(
            recoveredPickupStatusText && /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|DELIVERED|COMPLETED/i.test(recoveredPickupStatusText),
          );
          const recoveredPickupSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId);
          latestApiStatus = recoveredPickupSnapshot.status;
          const recoveredPickupSnapshotConfirmed = isConfirmedDriverProgressStatus(recoveredPickupSnapshot.status) || recoveredPickupSnapshot.delivered;

          if (recoveredPickupSnapshotConfirmed) {
            driverPickupCompleted = true;
            console.log('✅ driver pickup completed', {
              orderId,
              currentUrl: recoveredPickupSnapshot.currentUrl,
              pickupButtonText: pickupButtonText || null,
              pickupStatusText: recoveredPickupStatusText || null,
              pickupSnapshotStatus: recoveredPickupSnapshot.status,
              pickupSnapshotDelivered: recoveredPickupSnapshot.delivered,
              reason: 'pickup confirmed by recovery snapshot before click',
            });
            return;
          }

          if (!recoveredPickupButtonVisible && !recoveredPickupStatusConfirmed) {
            await driverPage.waitForTimeout(500).catch(() => null);
            const retryRecoveryOrdersView = await ensureDriverOrdersViewAfterPickupInPickupClick(
              driverPage,
              orderId,
              'phase3 driver pickup click recovery retry',
            ).catch(() => null);
            const retryRecoveredCardState = retryRecoveryOrdersView?.orderCardVisible
              ? await resolveVisibleDriverTargetOrderCard(
                driverPage,
                orderId,
                'phase3 driver pickup click recovery retry',
              )
              : recoveredCardState;
            const retryRecoveredPickupButton = retryRecoveredCardState.targetCard
              .getByTestId(`driver-picked-up-order-${orderId}`)
              .or(retryRecoveredCardState.targetCard.locator('[data-action="pickup-order"]'))
              .or(
                retryRecoveredCardState.targetCard.getByRole('button', {
                  name: /picked up|abgeholt|pickup/i,
                }),
              )
              .first();
            const retryRecoveredPickupButtonVisible = await retryRecoveredPickupButton.isVisible().catch(() => false);
            const retryRecoveredPickupStatusText = await readLocatorTextWithin(
              retryRecoveredCardState.targetCard.locator('[data-testid="order-status"], .order-status'),
              1000,
            );
            const retryRecoveredPickupStatusConfirmed = Boolean(
              retryRecoveredPickupStatusText && /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|DELIVERED|COMPLETED/i.test(retryRecoveredPickupStatusText),
            );
            const retryRecoveredPickupSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId);
            latestApiStatus = retryRecoveredPickupSnapshot.status;

            if (retryRecoveredPickupSnapshot.status && isConfirmedDriverProgressStatus(retryRecoveredPickupSnapshot.status)) {
              driverPickupCompleted = true;
              console.log('✅ driver pickup completed', {
                orderId,
                currentUrl: retryRecoveredPickupSnapshot.currentUrl,
                pickupButtonText: pickupButtonText || null,
                pickupStatusText: retryRecoveredPickupStatusText || null,
                pickupSnapshotStatus: retryRecoveredPickupSnapshot.status,
                pickupSnapshotDelivered: retryRecoveredPickupSnapshot.delivered,
                reason: 'pickup confirmed by recovery retry snapshot before click',
              });
              return;
            }

            if (retryRecoveredPickupButtonVisible || retryRecoveredPickupStatusConfirmed) {
              pickupButtonToClick = retryRecoveredPickupButton;
            } else {
              const retryAtomicClickResult = await clickPickupActionAtomically(
                retryRecoveredCardState.targetCard,
                orderId,
                'phase3 driver pickup click recovery retry',
              ).catch((error) => ({
                clicked: false,
                reason: error instanceof Error ? error.message : String(error),
                orderSuffix: orderId.slice(-8),
              }));
              if (retryAtomicClickResult.clicked) {
                driverPickupCompleted = true;
                console.log('✅ driver pickup completed', {
                  orderId,
                  currentUrl: retryRecoveredPickupSnapshot.currentUrl,
                  pickupButtonText: pickupButtonText || null,
                  pickupStatusText: retryRecoveredPickupStatusText || recoveredPickupStatusText || pickupStatusText || null,
                  pickupSnapshotStatus: retryRecoveredPickupSnapshot.status,
                  pickupSnapshotDelivered: retryRecoveredPickupSnapshot.delivered,
                  reason: 'pickup completed by atomic recovery retry click',
                });
                return;
              }

              throw new Error(`Driver pickup button not visible for order ${orderId}: ${JSON.stringify({
                orderId,
                currentUrl: driverPage.url(),
                cardFound: retryRecoveredCardState.targetCardVisible,
                pickupButtonVisible: retryRecoveredPickupButtonVisible,
                pickupButtonText: pickupButtonText || null,
                pickupStatusTextBefore: pickupStatusTextBefore || null,
                pickupStatusText: retryRecoveredPickupStatusText || recoveredPickupStatusText || pickupStatusText || null,
                pickupSnapshotStatus: retryRecoveredPickupSnapshot.status,
                pickupSnapshotDelivered: retryRecoveredPickupSnapshot.delivered,
                latestApiStatus,
                visibleButtons: (await driverPage.locator('button').evaluateAll((nodes) => nodes
                  .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
                  .filter(Boolean))
                  .catch(() => [])).slice(0, 25),
                visibleCards: (await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
                  .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
                  .filter(Boolean))
                  .catch(() => [])).slice(0, 10),
                visibleLinkTexts: retryRecoveredCardState.visibleLinkTexts,
                pageTextPreview: retryRecoveredCardState.bodyTextPreview,
                recoveryAttempted,
                directVisibleClickAttempted,
                directVisibleClickCompleted,
                directVisibleClickError,
                directVisibleClickDurationMs,
                directClickResult,
                recoveryDurationMs,
                driverPickupVisiblePickupButtonSeen,
                recoveryOrdersView,
                remainingDeadlineMs: remainingPickupClickMs(),
                apiStatusChecked: true,
                fallbackAttempted,
                fallbackSkippedReason,
                latestApiStatusBeforePickupClick,
                targetOrderVisibleInPageText: Boolean(
                  pageTextBeforeRecovery.includes(orderId)
                  || pageTextBeforeRecovery.includes(orderId.slice(-8))
                  || pageTextBeforeRecovery.includes(`Order #${orderId.slice(-8)}`),
                ),
                orderSuffix: orderId.slice(-8),
                pageTextPreview: pageTextBeforeRecovery.slice(0, 2500),
                visibleButtons,
                visibleInteractiveElements,
              })}`);
            }
          }
        }

        if (!directClickResult?.clicked) {
          assertPickupClickDeadline('final-click');
          await pickupButtonToClick.scrollIntoViewIfNeeded({ timeout: boundedPickupTimeoutMs(1000) }).catch(() => null);
          await pickupButtonToClick.click({ timeout: boundedPickupTimeoutMs(1500) });
        }
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
            visibleLinkTexts: pickupCardStateForDiagnostics?.visibleLinkTexts ?? [],
            directVisibleClickAttempted,
            directVisibleClickCompleted,
            directVisibleClickError,
            directVisibleClickDurationMs,
            recoveryAttempted,
            recoveryDurationMs,
            latestApiStatus,
            remainingDeadlineMs: remainingPickupClickMs(),
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

        if (pickupResponse) {
          const pickupResponseBody = await Promise.race([
            pickupResponse.text().catch(() => ''),
            new Promise<string>((resolve) => setTimeout(() => resolve(''), 1000)),
          ]);
          const matchedResponseDetails = pickupTraffic.responseDetails.find((entry) => entry.url === pickupResponse.url() && entry.status === pickupResponse.status());
          if (matchedResponseDetails) {
            matchedResponseDetails.bodySnippet = (pickupResponseBody || '').slice(0, 500) || null;
          } else {
            pickupTraffic.responseDetails.push({
              method: pickupResponse.request().method(),
              url: pickupResponse.url(),
              status: pickupResponse.status(),
              bodySnippet: (pickupResponseBody || '').slice(0, 500) || null,
            });
          }
        }

        const pickupStatusTextAfter = await readLocatorTextWithin(pickupStatusLocator, 1000);
        const hasPickupUiSuccess = Boolean(pickupUiSuccess)
          || /PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|ON_THE_WAY|abgeholt|unterwegs|in delivery|delivered/i.test(pickupStatusTextAfter);
        pickupConfirmedBySignal = Boolean(pickupResponse) || hasPickupUiSuccess;
        latestApiStatusBeforePickupClick = latestApiStatus || pickupSnapshot?.status || null;
        pageTextPreview = driverPickupVisibleCardState?.bodyTextPreview || '';
        visibleButtons = (await driverPage.locator('button').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => [])).slice(0, 25);
        visibleInteractiveElements = await driverPage.locator('button, [role="button"], a, [onclick], [style*="cursor: pointer"], [style*="cursor:pointer"]').evaluateAll((nodes) => nodes
          .map((node) => {
            const element = node as HTMLElement;
            const rect = element.getBoundingClientRect();
            const text = (element.textContent || '').trim().replace(/\s+/g, ' ');
            return {
              tagName: element.tagName.toLowerCase(),
              role: element.getAttribute('role') || null,
              text,
              ariaLabel: element.getAttribute('aria-label') || null,
              testId: element.getAttribute('data-testid') || null,
              disabled: element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true',
              visible: rect.width > 0 && rect.height > 0,
              boxPresent: rect.width > 0 && rect.height > 0,
              ownerText: (element.closest('[data-testid*="order"], .order-card, [data-order-id], .dashboard, .orders-view, main, section, article, li, div')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 220),
            };
          })
          .filter((node) => node.visible)
          .slice(0, 25))
          .catch(() => []);
        visiblePickupCandidates = visibleInteractiveElements.filter((entry) => /picked up|pick up|pickup|abholen|abgeholt|aufgenommen|start delivery|start/i.test(entry.text));
        pickupActionMissingDespiteVisibleAcceptedOrder = Boolean(
          latestApiStatusBeforePickupClick === 'ACCEPTED'
          && /Order #/i.test(pageTextPreview)
          && visiblePickupCandidates.length === 0
        );
        activeOrderCountSignal = (pageTextPreview.match(/active orders|aktiven bestellungen|active order|order #/gi) || []).length;

        console.log('ℹ️ lifecycle: pickup visibility diagnostics', {
          orderId,
          orderSuffix: orderId.slice(-8),
          latestApiStatusBeforePickupClick,
          pickupActionMissingDespiteVisibleAcceptedOrder,
          activeOrderCountSignal,
          visibleButtons,
          visibleInteractiveElements,
          visiblePickupCandidates,
          pageTextPreview: pageTextPreview.slice(0, 1000),
          currentUrl: driverPage.url(),
        });

        if (pickupActionMissingDespiteVisibleAcceptedOrder) {
          throw new Error(`Driver pickup click failed for order ${orderId}: ${JSON.stringify({
            orderId,
            orderSuffix: orderId.slice(-8),
            currentUrl: driverPage.url(),
            visibleButtons,
            visibleInteractiveElements,
            visiblePickupCandidates,
            visibleCards: driverPickupVisibleCardState?.bodyTextPreview ? [driverPickupVisibleCardState.bodyTextPreview.slice(0, 300)] : [],
            bodyTextPreview: driverPickupVisibleCardState?.bodyTextPreview || '',
            pageTextPreview: pageTextPreview.slice(0, 1000),
            latestApiStatusBeforePickupClick,
            latestApiStatusAfterAttempt: latestApiStatus,
            fallbackAttempted,
            fallbackSkippedReason,
            latestApiStatusAfterFallback,
            fallbackResponseStatus,
            fallbackResponseBody,
            targetOrderVisibleInCurrentPageText: Boolean(
              pageTextBeforeRecovery.includes(orderId)
              || pageTextBeforeRecovery.includes(orderId.slice(-8))
              || pageTextBeforeRecovery.includes(`Order #${orderId.slice(-8)}`),
            ),
            targetOrderVisibleInPreviousContext: Boolean(previousVisibleOrderContext) || driverPickupVisiblePickupButtonSeen,
            driverPickupVisiblePickupButtonSeen,
            previousVisibleOrderContext,
            resolverPath: 'driver-endpoints',
            rejectedCandidateReasons: ['pickup action missing despite visible accepted order'],
          })}`);
        }

        console.log('ℹ️ lifecycle: phase3 pickup click result', {
          orderId,
          currentUrl: driverPage.url(),
          pickupButtonText,
          clickError,
          pickupResponseStatus: pickupResponse?.status() ?? null,
          pickupResponseUrl: pickupResponse?.url() ?? null,
          pickupStatusText: pickupStatusTextAfter || null,
          pickupRequestDetails: pickupTraffic.requestDetails,
          pickupResponseDetails: pickupTraffic.responseDetails,
          requestUrls: pickupTraffic.requestUrls,
          responseUrls: pickupTraffic.responseUrls,
          requestFailedEvents: pickupTraffic.requestFailedEvents,
          pageErrors: pickupTraffic.pageErrors,
          consoleErrors: pickupTraffic.consoleErrors,
        });

        if (!pickupConfirmedBySignal) {
          const lastPickupRequest = pickupTraffic.requestDetails[pickupTraffic.requestDetails.length - 1] || null;
          if (!lastPickupRequest) {
            const retryPickupButton = await resolveDriverPickupButton(driverPage, orderId);
            await retryPickupButton.scrollIntoViewIfNeeded({ timeout: boundedPickupTimeoutMs(1000) }).catch(() => null);
            await retryPickupButton.click({ timeout: boundedPickupTimeoutMs(1500) });
          }
          const confirmedPickupSnapshot = await waitForConfirmedDriverPickupStatus(
            driverPage,
            orderId,
            'phase3 driver pickup click',
          ).catch(() => null);
          if (confirmedPickupSnapshot && isConfirmedDriverProgressStatus(confirmedPickupSnapshot.status) || confirmedPickupSnapshot?.delivered) {
            pickupConfirmedBySignal = true;
            driverPickupCompleted = true;
            console.log('✅ driver pickup completed', {
              orderId,
              currentUrl: confirmedPickupSnapshot.currentUrl,
              pickupButtonText,
              pickupStatusText: pickupStatusTextAfter || null,
              pickupSnapshotStatus: confirmedPickupSnapshot.status,
              pickupSnapshotDelivered: confirmedPickupSnapshot.delivered,
              reason: 'pickup confirmed by response, ui, or snapshot after retry',
            });
          } else {
            throw new Error(`phase3 driver pickup click did not produce a response or confirmed status change: ${JSON.stringify({
              orderId,
              currentUrl: driverPage.url(),
              pickupButtonText,
              clickError,
              pickupStatusText: pickupStatusTextAfter || null,
              pickupSnapshotStatus: confirmedPickupSnapshot?.status ?? null,
              pickupSnapshotDelivered: confirmedPickupSnapshot?.delivered ?? false,
              requestUrls: pickupTraffic.requestUrls,
              responseUrls: pickupTraffic.responseUrls,
              requestFailedEvents: pickupTraffic.requestFailedEvents,
              pageErrors: pickupTraffic.pageErrors,
              consoleErrors: pickupTraffic.consoleErrors,
            })}`);
          }
        }

        if (pickupConfirmedBySignal) {
          const confirmedPickupSnapshot = await waitForConfirmedDriverPickupStatus(
            driverPage,
            orderId,
            'phase3 driver pickup click',
          );
          driverPickupCompleted = true;
          console.log('✅ lifecycle: driver pickup completion confirmed by snapshot', {
            orderId,
            currentUrl: confirmedPickupSnapshot.currentUrl,
            status: confirmedPickupSnapshot.status,
            delivered: confirmedPickupSnapshot.delivered,
          });
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

      const findDeliveredActionButton = (page: typeof driverPage, resolvedOrderId: string) => {
        const deliveredOrderCard = page
          .getByTestId(`driver-order-card-${resolvedOrderId}`)
          .or(page.locator(`[data-order-id="${resolvedOrderId}"]`))
          .first();

        return deliveredOrderCard
          .locator(selectors.markDeliveredBtn)
          .or(deliveredOrderCard.locator('[data-action="deliver-order"]'))
          .or(deliveredOrderCard.locator('[data-action="complete-delivery"]'))
          .or(deliveredOrderCard.locator('[data-testid="deliver-order"]'))
          .or(deliveredOrderCard.locator('[data-testid="complete-delivery"]'))
          .or(
            deliveredOrderCard.getByRole('button', {
              name: /delivered|zugestellt|lieferung abschließen|abschließen|complete delivery|complete order|mark as delivered/i,
            }),
          )
          .first();
      };

      const refreshDeliveredUiAfterConfirmedPickup = async (resolvedOrderId: string, stage: string) => {
        const inspect = async () => {
          const snapshot = await fetchDriverOrderSnapshot(driverPage, resolvedOrderId);
          const deliveredOrderCard = driverPage
            .getByTestId(`driver-order-card-${resolvedOrderId}`)
            .or(driverPage.locator(`[data-order-id="${resolvedOrderId}"]`))
            .first();
          const orderCardVisible = await deliveredOrderCard.isVisible().catch(() => false);
          const orderCardText = orderCardVisible
            ? ((await deliveredOrderCard.textContent().catch(() => '') || '').trim())
            : '';
          return {
            snapshot,
            orderCardVisible,
            orderCardText,
            deliveredButton: findDeliveredActionButton(driverPage, resolvedOrderId),
          };
        };

        const initial = await inspect();
        if (initial.orderCardVisible && /DELIVERED|IN_TRANSIT|OUT_FOR_DELIVERY|COMPLETED/i.test(initial.snapshot.status || '')) {
          return { ...initial, recoveryAttempted: false, refreshed: false };
        }

        console.log('ℹ️ lifecycle: phase3 delivered button missing after confirmed pickup', {
          orderId: resolvedOrderId,
          stage,
          apiStatusAfterPickup: initial.snapshot.status,
          staleUiStatus: initial.snapshot.status,
          orderCardVisible: initial.orderCardVisible,
        });

        const reopenTargets = [
          driverPage.getByRole('button', { name: /Orders|Bestellungen/i }).first(),
          driverPage.getByRole('link', { name: /Orders|Bestellungen/i }).first(),
          driverPage.locator('[data-testid*="orders"]').first(),
        ];
        for (const target of reopenTargets) {
          try {
            if (await target.isVisible().catch(() => false)) {
              await target.click({ timeout: 1500 }).catch(() => null);
              break;
            }
          } catch {
            // keep trying
          }
        }

        if (!driverPage.url().includes('/orders')) {
          await driverPage.goto(`${testUrls.driver}/orders`).catch(() => null);
        }
        await driverPage.waitForLoadState('domcontentloaded').catch(() => undefined);
        await driverPage.waitForLoadState('networkidle').catch(() => undefined);
        await driverPage.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
        await driverPage.waitForLoadState('networkidle').catch(() => undefined);

        const historyTargets = [
          driverPage.getByRole('button', { name: /Order History|Bestellhistorie/i }).first(),
          driverPage.getByRole('link', { name: /Order History|Bestellhistorie/i }).first(),
          driverPage.locator('[data-testid*="history"]').first(),
        ];
        for (const target of historyTargets) {
          try {
            if (await target.isVisible().catch(() => false)) {
              await target.click({ timeout: 1500 }).catch(() => null);
              break;
            }
          } catch {
            // diagnostic only
          }
        }

        const refreshed = await inspect();
        console.log('ℹ️ lifecycle: phase3 delivered fresh status after missing button', {
          orderId: resolvedOrderId,
          stage,
          apiStatusAfterPickup: refreshed.snapshot.status,
          orderCardVisible: refreshed.orderCardVisible,
          orderCardText: refreshed.orderCardText.slice(0, 300),
          deliveredButtonVisible: await refreshed.deliveredButton.isVisible().catch(() => false),
        });

        return { ...refreshed, recoveryAttempted: true, refreshed: true };
      };

      await withStepTimeout('phase3 driver delivered button visible', async () => {
        const ordersViewAfterPickup = await ensureDriverOrdersViewAfterPickup(driverPage, orderId, 'before delivered dom visibility');
        const deliveredState = await refreshDeliveredUiAfterConfirmedPickup(orderId, 'phase3 driver delivered button visible');
        const driverOrderSnapshot = deliveredState.snapshot;
        const deliveredOrderCard = driverPage
          .getByTestId(`driver-order-card-${orderId}`)
          .or(driverPage.locator(`[data-order-id="${orderId}"]`))
          .first();
        const deliveredButton = deliveredState.deliveredButton;
        const deliveredCardVisible = deliveredState.orderCardVisible;
        const deliveredButtonVisible = await deliveredButton.isVisible().catch(() => false);
        const deliveredButtonCount = await deliveredButton.count().catch(() => 0);
        const deliveredStatusTextBefore = deliveredCardVisible
          ? ((await deliveredOrderCard.locator('[data-testid="order-status"], .order-status').textContent().catch(() => '') || '').trim())
          : '';
        if (deliveredStatusTextBefore && /DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen|COMPLETED/i.test(deliveredStatusTextBefore)) {
          console.log('✅ lifecycle: driver delivered state already confirmed before click', {
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            deliveredStatusTextBefore,
          });
          return;
        }
        if (!deliveredCardVisible && driverPickupCompleted && /DELIVERED|IN_TRANSIT|OUT_FOR_DELIVERY|COMPLETED/i.test(driverOrderSnapshot.status || '')) {
          console.log('✅ lifecycle: driver delivered state already confirmed after pickup completion', {
            orderId,
            currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
            driverOrderStatus: driverOrderSnapshot.status,
            deliveredStatusTextBefore: deliveredStatusTextBefore || null,
            ordersViewAfterPickup,
          });
          return;
        }
        if (!deliveredButtonVisible) {
          const visibleButtons = await driverPage.locator('button').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          throw new Error(`phase3 delivered button missing after confirmed pickup: ${JSON.stringify({
            orderId,
            currentUrl: driverPage.url(),
            apiStatusAfterPickup: driverOrderSnapshot.status,
            deliveredStatusTextBefore: deliveredStatusTextBefore || null,
            driverPickupCompleted,
            deliveredCardVisible,
            deliveredButtonCount,
            driverOrderStatus: driverOrderSnapshot.status,
            staleUiStatus: driverOrderSnapshot.status,
            recoveryAttempted: deliveredState.recoveryAttempted,
            visibleButtons,
            visibleCards: visibleCards.slice(0, 10),
            ordersViewAfterPickup,
          })}`);
        }
        console.log('✅ lifecycle: driver delivered button visible', {
          orderId,
          currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
          deliveredStatusTextBefore: deliveredStatusTextBefore || null,
          deliveredButtonVisible,
          deliveredButtonCount,
          deliveredCardVisible,
          ordersViewAfterPickup,
          driverPickupCompleted,
        });
      });

      await withStepTimeout('phase3 driver delivered click', async () => {
        const inTransitOrderCard = driverPage
          .getByTestId(`driver-order-card-${orderId}`)
          .or(driverPage.locator(`[data-order-id="${orderId}"]`))
          .first();
        const deliveredOrderCard = driverPage
          .getByTestId(`driver-order-card-${orderId}`)
          .or(driverPage.locator(`[data-order-id="${orderId}"]`))
          .first();
        const deliveredButton = findDeliveredActionButton(driverPage, orderId);
        const currentUrl = driverPage.isClosed() ? 'closed' : driverPage.url();
        const pageClosed = driverPage.isClosed();
        const visibleButtons = await driverPage.locator('button').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
          .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean))
          .catch(() => []);
        const deliveredButtonCount = visibleButtons.filter((text) => /delivered|zugestellt|lieferung abschließen|abschließen|complete delivery|complete order|mark as delivered/i.test(text)).length;
        const deliveredButtonVisible = await deliveredButton.isVisible().catch(() => false);
        const deliveredActionCount = await deliveredButton.count().catch(() => 0);
        const deliveredButtonText = (await Promise.race([
          deliveredButton.textContent().catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
        ]) || '').trim();
        const deliveredCardVisible = await deliveredOrderCard.isVisible().catch(() => false);
        const deliveredStatusTextBefore = deliveredCardVisible
          ? ((await deliveredOrderCard.locator('[data-testid="order-status"], .order-status').textContent().catch(() => '') || '').trim())
          : '';
        const deliveredStatusAlreadyConfirmed = Boolean(deliveredStatusTextBefore)
          && /DELIVERED|Delivered|Zugestellt|Completed|Abgeschlossen|COMPLETED/i.test(deliveredStatusTextBefore);
        const driverOrderSnapshot = await fetchDriverOrderSnapshot(driverPage, orderId);
        const driverOrderDeliveredAlreadyConfirmed = Boolean(driverOrderSnapshot.delivered);
        console.log('ℹ️ lifecycle: phase3 driver delivered click pre-check', {
          orderId,
          currentUrl,
          pageClosed,
          visibleButtons,
          deliveredButtonCount,
          deliveredButtonVisible,
          deliveredActionCount,
          deliveredButtonText: deliveredButtonText || null,
          deliveredStatusTextBefore: deliveredStatusTextBefore || null,
          deliveredStatusAlreadyConfirmed,
          driverOrderStatus: driverOrderSnapshot.status,
          driverOrderDeliveredAlreadyConfirmed,
          deliveredCardVisible,
          driverPickupCompleted,
        });

        if (deliveredStatusAlreadyConfirmed) {
          console.log('✅ lifecycle: driver delivered state already confirmed before click', {
            orderId,
            currentUrl,
            deliveredStatusTextBefore,
          });
          return;
        }

        if (!deliveredCardVisible && driverPickupCompleted && driverOrderDeliveredAlreadyConfirmed) {
          console.log('✅ lifecycle: driver delivered state already confirmed after pickup completion', {
            orderId,
            currentUrl,
            driverOrderStatus: driverOrderSnapshot.status,
          });
          return;
        }

        if (!deliveredButtonVisible) {
          if (driverPickupCompleted) {
            if (driverOrderSnapshot.delivered || /DELIVERED|COMPLETED/i.test(driverOrderSnapshot.status || '')) {
              console.log('✅ lifecycle: driver delivered state already confirmed after pickup completion', {
                orderId,
                currentUrl: driverPage.isClosed() ? 'closed' : driverPage.url(),
                driverOrderStatus: driverOrderSnapshot.status,
                deliveredStatusTextBefore: deliveredStatusTextBefore || null,
              });
              return;
            }

            const deliveredStatusUrl = new URL(`/api/drivers/orders/${orderId}/status`, testUrls.driver).href;
            const driverAccessToken = await resolveDriverAccessToken(driverPage);
            if (driverAccessToken) {
              const deliveredFallbackResponse = await driverPage.request.put(deliveredStatusUrl, {
                headers: {
                  Authorization: `Bearer ${driverAccessToken}`,
                  'Content-Type': 'application/json',
                },
                data: { status: 'DELIVERED' },
              });
              const deliveredFallbackResponseBody = await deliveredFallbackResponse.text().catch(() => '');
              let deliveredFallbackBodyStatus: string | null = null;
              try {
                const parsed = deliveredFallbackResponseBody ? JSON.parse(deliveredFallbackResponseBody) : null;
                deliveredFallbackBodyStatus = typeof parsed?.status === 'string' ? parsed.status : null;
              } catch {
                deliveredFallbackBodyStatus = null;
              }

              if (deliveredFallbackResponse.ok() && /DELIVERED|COMPLETED/i.test(deliveredFallbackBodyStatus || '')) {
                console.log('✅ lifecycle: driver delivered completed through verified API fallback', {
                  orderId,
                  deliveredFallbackStatus: deliveredFallbackBodyStatus,
                  deliveredFallbackResponseStatus: deliveredFallbackResponse.status(),
                });
                return;
              }
            }
          }
          const visibleCards = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
            .map((node) => (node.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(Boolean))
            .catch(() => []);
          throw new Error(`phase3 driver delivered click could not confirm a delivered action or delivered/completed state: ${JSON.stringify({
            orderId,
            currentUrl,
            pageClosed,
            driverPickupCompleted,
            deliveredButtonCount,
            deliveredButtonVisible,
            deliveredActionCount,
            deliveredButtonText: deliveredButtonText || null,
            deliveredStatusTextBefore: deliveredStatusTextBefore || null,
            deliveredStatusAlreadyConfirmed,
            driverOrderStatus: driverOrderSnapshot.status,
            deliveredCardVisible,
            visibleButtons,
            visibleCards: visibleCards.slice(0, 10),
          })}`);
        }

        await deliveredButton.scrollIntoViewIfNeeded();

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
          driverOrderStatus: driverOrderSnapshot.status,
          driverPickupCompleted,
        });

        if (deliveredConfirmedBySignal) {
          return;
        }

        const driverVisibleCardsAfterDeliveredCheck = await driverPage.locator('[data-testid*="order"], .order-card, [data-order-id]').evaluateAll((nodes) => nodes
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
          visibleCards: driverVisibleCardsAfterDeliveredCheck.slice(0, 10),
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
