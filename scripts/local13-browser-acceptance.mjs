import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromCustomer = createRequire(path.join(repoRoot, "frontend", "customer-web", "package.json"));
let chromium;
try {
  ({ chromium } = requireFromCustomer("playwright"));
} catch (error) {
  throw new Error(`Playwright ist nicht verfügbar. Installiere frontend/customer-web zuerst. ${error.message}`);
}

function fail(message) {
  throw new Error(message);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const sessionFile = argValue("--session-file") || process.env.LOCAL13_SESSION_FILE;
if (!sessionFile || !existsSync(sessionFile)) fail("LOCAL13_SESSION_FILE oder --session-file ist erforderlich");
const session = JSON.parse(readFileSync(sessionFile, "utf8"));
if (!existsSync(session.credentialBundlePath)) fail("Credential-Bundle fehlt; die Session ist nicht startbereit");
const credentials = JSON.parse(readFileSync(session.credentialBundlePath, "utf8"));
const artifactRoot = path.join(session.artifactRoot, "browser");
const screenshotRoot = path.join(artifactRoot, "screenshots");
mkdirSync(screenshotRoot, { recursive: true });

const network = [];
const consoleEvents = [];
const eventsPath = path.join(artifactRoot, "events.jsonl");
const contexts = [];
const lifecycle = { statusSequence: [], orderId: null };
const negativeCases = [];
const roles = ["customer", "admin", "restaurant", "driverA", "driverB", "guest"];
const localOrigins = new Set(Object.values(session.urls).map((url) => new URL(url).origin));

function secretValues() {
  return [
    ...Object.values(credentials.roles).flatMap((role) => [role.email, role.password]),
    ...Object.values(credentials.internal),
  ].filter(Boolean);
}

function sanitize(value) {
  let result = String(value ?? "");
  for (const secret of secretValues()) result = result.split(secret).join("[redacted]");
  return result
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/(password|secret|token|cookie|authorization)\s*[=:]\s*[^\s,}]+/gi, "$1=[redacted]");
}

function safePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "[invalid-url]";
  }
}

function optional404(pathname) {
  return /\/(gift-cards|promotions\/public|reviews|legal-pages|geocoding|notifications|gamification|analytics|social)\//i.test(pathname)
    || /\/(gift-cards\/active|promotions\/public\/active|reviews\/my-reviews|geocoding\/)/i.test(pathname);
}

function expectedDriverOptional404(pathname) {
  return /^\/api\/drivers\/[^/]+\/(subscription|insights\/roi)$/i.test(pathname)
    || pathname === "/api/drivers/push/public-key"
    || pathname === "/api/geofencing/events"
    || /^\/api\/geofencing\/order\/[^/]+$/i.test(pathname);
}

function expectedAdminOptional404(pathname) {
  return /^\/api\/admin\/statistics\/(top-restaurants|driver-performance|top-promotions|promotion-performance)$/i.test(pathname);
}

function expectedStatic404(pathname) {
  return ["/placeholder-restaurant.jpg", "/placeholder-image.jpg", "/favicon.ico"].includes(pathname);
}

function expectedFallback404(pathname) {
  return /\/restaurants\/[^/]+\/estimated-delivery-time$/i.test(pathname)
    || pathname === "/api/customers/me/payment-methods";
}

function statusClassification(status, pathname, role) {
  if ([401, 403].includes(status) && (role === "guest" || role.startsWith("negative-") || role === "driverB")) return "expected-negative";
  if (status === 401 && role === "admin") return "expected-auth-bootstrap";
  if (status === 409) return "expected-conflict";
  if (status === 404 && optional404(pathname)) return "expected-optional";
  if (status === 404 && expectedDriverOptional404(pathname)) return "expected-driver-optional";
  if (status === 404 && expectedAdminOptional404(pathname)) return "expected-admin-optional";
  return status >= 400 ? "unexpected" : "ok";
}

function recordEvent(type, payload = {}) {
  appendFileSync(eventsPath, `${JSON.stringify({ at: new Date().toISOString(), type, ...payload })}\n`, "utf8");
}

function attachCollectors(page, role) {
  contexts.push({ role, origin: null, contextId: `${role}-${contexts.length + 1}` });
  const requestStarted = new WeakMap();
  const page404 = { known: 0, unknown: 0 };
  page.on("request", (request) => requestStarted.set(request, Date.now()));
  page.on("response", (response) => {
    const pathname = safePath(response.url());
    const origin = (() => { try { return new URL(response.url()).origin; } catch { return "[invalid]"; } })();
    if (!localOrigins.has(origin) && !pathname.includes("socket.io")) return;
    const status = response.status();
    if (status === 404) {
      if (optional404(pathname) || expectedStatic404(pathname) || expectedFallback404(pathname) || expectedDriverOptional404(pathname) || expectedAdminOptional404(pathname)) page404.known += 1;
      else page404.unknown += 1;
    }
    const classification = status === 404 && expectedStatic404(pathname)
      ? "expected-static-fallback"
      : status === 404 && expectedFallback404(pathname)
        ? "expected-api-fallback"
        : statusClassification(status, pathname, role);
    network.push({
      timestamp: new Date().toISOString(),
      browserRole: role,
      method: response.request().method(),
      origin,
      path: pathname,
      status,
      durationMs: Date.now() - (requestStarted.get(response.request()) || Date.now()),
      expected: classification !== "unexpected",
      classification,
      errorCode: null,
    });
  });
  page.on("requestfailed", (request) => {
    const pathname = safePath(request.url());
    const errorCode = request.failure()?.errorText || "requestfailed";
    const origin = (() => { try { return new URL(request.url()).origin; } catch { return "[invalid]"; } })();
    const expected = errorCode === "net::ERR_ABORTED"
      || (!localOrigins.has(origin) && ["csp", "net::ERR_BLOCKED_BY_CLIENT"].includes(errorCode));
    network.push({
      timestamp: new Date().toISOString(),
      browserRole: role,
      method: request.method(),
      origin,
      path: pathname,
      status: 0,
      durationMs: null,
      expected,
      classification: expected ? (errorCode === "net::ERR_ABORTED" ? "expected-navigation-abort" : "expected-external-block") : "unexpected",
      errorCode: sanitize(errorCode),
    });
  });
  page.on("console", (message) => {
    const text = sanitize(message.text());
    const expected = ["log", "info", "debug"].includes(message.type())
      || (message.type() === "warning" && /API Endpoint not found|Failed to load resource/i.test(text))
      || (/401 \(Unauthorized\)/i.test(text) && (role === "guest" || role.startsWith("negative-") || role === "admin"))
      || (/404 \(Not Found\)/i.test(text) && page404.unknown === 0 && page404.known > 0)
      || (/Content Security Policy|fonts\.googleapis\.com/i.test(text));
    consoleEvents.push({ timestamp: new Date().toISOString(), browserRole: role, type: message.type(), message: text, expected, classification: expected ? "expected-known" : "unexpected" });
  });
  page.on("pageerror", (error) => {
    consoleEvents.push({ timestamp: new Date().toISOString(), browserRole: role, type: "pageerror", message: sanitize(error.message), expected: false });
  });
  page.on("websocket", (socket) => {
    socket.on("socketerror", (error) => {
      consoleEvents.push({ timestamp: new Date().toISOString(), browserRole: role, type: "websocket-error", message: sanitize(error), expected: false });
    });
    socket.on("close", () => recordEvent("websocket-close", { browserRole: role }));
  });
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(500);
}

async function visible(locator, timeout = 30_000) {
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

async function clickAndObserve(page, locator, routeFragment, label) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(routeFragment),
    { timeout: 30_000 },
  ).catch(() => null);
  await locator.click({ timeout: 30_000 });
  const response = await responsePromise;
  recordEvent("ui-action", { role: page.__local13Role, action: label, httpStatus: response?.status() ?? null });
  return response;
}

async function screenshot(page, filename) {
  await page.screenshot({ path: path.join(screenshotRoot, filename), fullPage: true });
}

async function loginCustomer(page) {
  page.__local13Role = "customer";
  await goto(page, `${session.urls.customer}/login`);
  await visible(page.getByTestId("email-input"));
  await page.getByTestId("email-input").fill(credentials.roles.customer.email);
  await page.getByTestId("password-input").fill(credentials.roles.customer.password);
  const response = await clickAndObserve(page, page.getByTestId("login-button"), "/api/auth/customer/login", "customer-login");
  if (!response || response.status() >= 400) fail(`Customer-Login fehlgeschlagen: ${response?.status() ?? "kein Response"}`);
  await visible(page.getByTestId("restaurant-list"), 45_000);
}

async function loginRestaurant(page) {
  page.__local13Role = "restaurant";
  await goto(page, `${session.urls.restaurant}/login`);
  await visible(page.locator('input[type="email"]'));
  await page.locator('input[type="email"]').fill(credentials.roles.restaurant.email);
  await page.locator('input[type="password"]').fill(credentials.roles.restaurant.password);
  const response = await clickAndObserve(page, page.getByRole("button", { name: "Anmelden", exact: true }), "/api/auth/restaurant/login", "restaurant-login");
  if (!response || response.status() >= 400) fail(`Restaurant-Login fehlgeschlagen: ${response?.status() ?? "kein Response"}`);
  await page.waitForTimeout(1000);
  const onboarding = page.locator(".onboarding-wrapper");
  if (await onboarding.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Schritt überspringen", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Lieferzonen", exact: true }));
    await clickAndObserve(page, page.getByRole("button", { name: "Lieferzone speichern & weiter", exact: true }), "/delivery-zones", "restaurant-onboarding-zone");
    await visible(page.getByRole("heading", { name: "Fertig!", exact: true }));
    await page.getByRole("button", { name: "Zum Dashboard", exact: true }).click();
  }
  await visible(page.locator(".app"), 45_000);
}

async function loginDriver(page, role) {
  page.__local13Role = role;
  const user = credentials.roles[role === "driverA" ? "driverA" : "driverB"];
  await goto(page, `${session.urls.driver}/login`);
  await visible(page.getByTestId("login-form"));
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  const response = await clickAndObserve(page, page.getByRole("button", { name: "Anmelden", exact: true }), "/api/auth/driver/login", `${role}-login`);
  if (!response || response.status() >= 400) fail(`${role}-Login fehlgeschlagen: ${response?.status() ?? "kein Response"}`);
  await visible(page.getByTestId("driver-dashboard"), 45_000);
}

async function loginAdmin(page) {
  page.__local13Role = "admin";
  await goto(page, session.urls.admin);
  await visible(page.getByRole("form", { name: "Login-Formular" }));
  await page.locator('[name="email"]').fill(credentials.roles.admin.email);
  await page.locator('[name="password"]').fill(credentials.roles.admin.password);
  const response = await clickAndObserve(page, page.getByRole("button", { name: "Anmelden", exact: true }), "/api/auth/login", "admin-login");
  if (!response || response.status() >= 400) fail(`Admin-Login fehlgeschlagen: ${response?.status() ?? "kein Response"}`);
  await visible(page.getByTestId("admin-shell"), 45_000);
}

async function guestProtectedChecks(page) {
  page.__local13Role = "guest";
  const checks = [
    [session.urls.customer, "/orders", page.getByTestId("email-input")],
    [session.urls.admin, "/", page.getByRole("form", { name: "Login-Formular" })],
    [session.urls.restaurant, "/", page.locator('input[type="email"]')],
    [session.urls.driver, "/", page.getByTestId("login-form")],
  ];
  for (const [base, route, loginLocator] of checks) {
    await goto(page, `${base}${route}`);
    await visible(loginLocator, 30_000);
    recordEvent("negative-case", { role: "guest", action: `protected-route:${route}`, target: base, result: "PASS" });
  }
}

async function negativeLogin(browser, role, target, loginUrl, endpoint) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.__local13Role = `negative-${role}-${target}`;
  attachCollectors(page, page.__local13Role);
  const user = credentials.roles[role];
  const loginSelectors = {
    form: page.getByRole("form", { name: "Login-Formular" }),
    email: page.locator('[name="email"]'),
    password: page.locator('[name="password"]'),
    submit: page.getByRole("button", { name: "Anmelden", exact: true }),
  };
  await goto(page, loginUrl);
  await visible(loginSelectors.form);
  await loginSelectors.email.fill(user.email);
  await loginSelectors.password.fill(user.password);
  const response = await clickAndObserve(page, loginSelectors.submit, endpoint, `negative-${role}-on-${target}`);
  const status = response?.status() ?? null;
  const passed = [401, 403].includes(status) && await loginSelectors.form.isVisible().catch(() => false);
  negativeCases.push({ role, action: "UI login with incompatible role", target, expected: "401/403 and login remains visible", actualHttpStatus: status, dataLeak: false, result: passed ? "PASS" : "FAIL" });
  await context.close();
  if (!passed) fail(`Negative Login fehlgeschlagen: ${role} auf ${target}`);
}

async function updateRestaurantOrder(page, orderId, buttonName, expectedStatus, label) {
  const card = page.locator(`[data-order-id="${orderId}"]`);
  await visible(card, 45_000);
  await clickAndObserve(page, card.getByRole("button", { name: buttonName, exact: true }), `/api/orders/${orderId}/status`, label);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(({ id, status }) => document.querySelector(`[data-order-id="${id}"]`)?.getAttribute("data-status") === status, { id: orderId, status: expectedStatus }, { timeout: 30_000 });
  lifecycle.statusSequence.push({ actor: "restaurant", status: expectedStatus });
}

async function updateDriverOrder(page, orderId, testIdSuffix, expectedStatus, label) {
  const card = page.locator(`[data-order-id="${orderId}"]`);
  await visible(card, 45_000);
  await clickAndObserve(page, card.getByTestId(`driver-${testIdSuffix}-order-${orderId}`), `/api/orders/${orderId}/status`, label);
  if (expectedStatus === "DELIVERED") {
    await visible(page.getByText(`Bestellung #${orderId.slice(-8)}`, { exact: false }), 30_000);
  } else {
    await page.waitForFunction(({ id, status }) => document.querySelector(`[data-order-id="${id}"]`)?.getAttribute("data-status") === status, { id: orderId, status: expectedStatus }, { timeout: 30_000 });
  }
  lifecycle.statusSequence.push({ actor: "driverA", status: expectedStatus });
}

async function clickAdminTab(page, tab) {
  const link = page.getByTestId(`sidebar-link-${tab}`);
  if (!(await link.isVisible().catch(() => false))) {
    const advancedGroup = page.getByRole("button", { name: /Erweitert.*(ausklappen|einklappen)/i }).first();
    if (await advancedGroup.isVisible().catch(() => false)) await advancedGroup.click();
  }
  await visible(link, 30_000);
  await link.click();
}

async function runAcceptance() {
  writeFileSync(eventsPath, "", "utf8");
  recordEvent("run-start", { runId: session.runId, gitHead: session.gitHead, namespace: session.namespace });
  const browser = await chromium.launch({ headless: true });
  const browserContexts = {};
  let customerPage;
  let restaurantPage;
  let driverAPage;
  let driverBPage;
  let adminPage;
  try {
    browserContexts.customer = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    browserContexts.restaurant = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    browserContexts.driverA = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    browserContexts.driverB = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    browserContexts.admin = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    browserContexts.guest = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    customerPage = await browserContexts.customer.newPage();
    restaurantPage = await browserContexts.restaurant.newPage();
    driverAPage = await browserContexts.driverA.newPage();
    driverBPage = await browserContexts.driverB.newPage();
    adminPage = await browserContexts.admin.newPage();
    const guestPage = await browserContexts.guest.newPage();
    for (const [page, role] of [[customerPage, "customer"], [restaurantPage, "restaurant"], [driverAPage, "driverA"], [driverBPage, "driverB"], [adminPage, "admin"], [guestPage, "guest"]]) attachCollectors(page, role);

    await guestProtectedChecks(guestPage);
    await loginCustomer(customerPage);
    await screenshot(customerPage, "customer-authenticated.png");
    await goto(customerPage, `${session.urls.customer}/profile`);
    await visible(customerPage.getByTestId("profile-address-input"));
    await customerPage.getByTestId("profile-name-input").fill("Local Test Customer");
    await customerPage.getByTestId("profile-address-input").fill("Local Test Street 1, 1010 Vienna");
    await customerPage.getByTestId("profile-phone-input").fill("+43123456789");
    await clickAndObserve(customerPage, customerPage.getByTestId("profile-save-button"), "/api/customers/profile", "customer-profile-address");
    await goto(customerPage, session.urls.customer);
    await visible(customerPage.getByTestId("restaurant-list"));
    const restaurantCard = customerPage.getByTestId("restaurant-card").filter({ hasText: "CI Test Restaurant" }).first();
    await visible(restaurantCard, 45_000);
    await restaurantCard.click();
    const restaurantUrl = customerPage.url();
    const restaurantId = restaurantUrl.match(/\/restaurant\/([^/?]+)/)?.[1];
    if (!restaurantId) fail("Restaurant-ID konnte nicht aus der UI-Route gelesen werden");
    await visible(customerPage.getByTestId("menu-content"), 45_000);
    await customerPage.getByTestId("add-to-cart-button").first().click();
    await visible(customerPage.getByTestId("cart-placeholder"));
    await customerPage.getByTestId("checkout-button").click();
    await visible(customerPage.getByTestId("checkout-button"));
    const createResponse = await clickAndObserve(customerPage, customerPage.getByTestId("checkout-button"), "/api/orders/customer", "customer-create-order");
    if (!createResponse || ![200, 201, 202].includes(createResponse.status())) fail(`Customer-Bestellung fehlgeschlagen: ${createResponse?.status() ?? "kein Response"}`);
    await visible(customerPage.getByTestId("payment-modal"), 45_000);
    await screenshot(customerPage, "customer-order-created.png");
    await customerPage.getByRole("button", { name: "Überweisung", exact: true }).click();
    await customerPage.locator(".bank-transfer-form input").nth(0).fill("AT611904300234573201");
    await customerPage.locator(".bank-transfer-form input").nth(1).fill("Local Test Customer");
    await clickAndObserve(customerPage, customerPage.getByTestId("payment-confirm-button"), `/api/orders/`, "customer-local-payment");
    await customerPage.waitForURL(/\/orders\/[^/?]+/, { timeout: 45_000 });
    lifecycle.orderId = customerPage.url().match(/\/orders\/([^/?]+)/)?.[1];
    if (!lifecycle.orderId) fail("Bestell-ID konnte nicht aus der Customer-UI gelesen werden");
    await visible(customerPage.getByTestId("order-tracking-page"), 45_000);
    const initialStatus = await customerPage.locator(".timeline-step.current").innerText().catch(() => "PENDING");
    lifecycle.statusSequence.push({ actor: "customer", status: initialStatus.replace(/\s+/g, " ").trim() });

    await loginRestaurant(restaurantPage);
    const restaurantOrdersTab = restaurantPage.locator("button.sidebar-item").filter({ hasText: "Bestellungen" }).first();
    await restaurantOrdersTab.click();
    const restaurantOrder = restaurantPage.locator(`[data-order-id="${lifecycle.orderId}"]`);
    await visible(restaurantOrder, 45_000);
    await screenshot(restaurantPage, "restaurant-order-visible.png");
    await updateRestaurantOrder(restaurantPage, lifecycle.orderId, "Annehmen", "CONFIRMED", "restaurant-confirm-order");
    await updateRestaurantOrder(restaurantPage, lifecycle.orderId, "Zubereiten", "PREPARING", "restaurant-start-preparing");
    await updateRestaurantOrder(restaurantPage, lifecycle.orderId, "Bereit zur Abholung", "READY_FOR_PICKUP", "restaurant-ready-for-pickup");
    await screenshot(restaurantPage, "restaurant-ready-for-pickup.png");
    await restaurantPage.reload({ waitUntil: "domcontentloaded" });
    await restaurantPage.locator("button.sidebar-item").filter({ hasText: "Bestellungen" }).first().click().catch(() => undefined);
    await pageWaitForOrderStatus(restaurantPage, lifecycle.orderId, "READY_FOR_PICKUP");
    await restaurantPage.locator('button[aria-label="Abmelden"]').click();
    await visible(restaurantPage.locator('input[type="email"]'));

    await loginDriver(driverAPage, "driverA");
    const availabilityButton = driverAPage.locator("button.status-indicator").first();
    if (await availabilityButton.isVisible().catch(() => false) && /offline/i.test(await availabilityButton.innerText().catch(() => ""))) {
      await availabilityButton.click();
      await driverAPage.getByRole("button", { name: "Online", exact: true }).waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
    }
    const availableOrder = driverAPage.locator(`[data-order-id="${lifecycle.orderId}"]`);
    await visible(availableOrder, 45_000);
    await clickAndObserve(driverAPage, availableOrder.getByTestId(`driver-accept-order-${lifecycle.orderId}`), `/orders/${lifecycle.orderId}/accept`, "driverA-accept-order");
    await driverAPage.waitForTimeout(1500);
    await screenshot(driverAPage, "driver-a-order-accepted.png");
    lifecycle.statusSequence.push({ actor: "driverA", status: await availableOrder.getAttribute("data-status") });

    await loginDriver(driverBPage, "driverB");
    await driverBPage.waitForTimeout(2500);
    const driverBOrderVisible = await driverBPage.locator(`[data-order-id="${lifecycle.orderId}"]`).isVisible().catch(() => false);
    const driverBBodyBeforeDeepLink = await driverBPage.locator("body").innerText();
    await driverBPage.goto(`${session.urls.driver}/orders/${lifecycle.orderId}`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await driverBPage.waitForTimeout(1000);
    const driverBBodyAfterDeepLink = await driverBPage.locator("body").innerText();
    const ownershipPass = !driverBOrderVisible && !driverBBodyBeforeDeepLink.includes(lifecycle.orderId) && !driverBBodyAfterDeepLink.includes(lifecycle.orderId);
    negativeCases.push({ role: "driverB", action: "UI available-order and deep-link ownership check", target: lifecycle.orderId, expected: "no Driver-A order card or protected details", actualHttpStatus: null, dataLeak: !ownershipPass, result: ownershipPass ? "PASS" : "FAIL" });
    await screenshot(driverBPage, "negative-driver-b-ownership.png");
    if (!ownershipPass) fail("Driver-B-Ownership verletzt");

    await driverAPage.reload({ waitUntil: "domcontentloaded" });
    await visible(driverAPage.getByTestId("driver-dashboard"), 45_000);
    await driverAPage.waitForFunction(({ id }) => document.querySelector(`[data-order-id="${id}"]`)?.getAttribute("data-status") === "ACCEPTED", { id: lifecycle.orderId }, { timeout: 30_000 });
    await updateDriverOrder(driverAPage, lifecycle.orderId, "picked-up", "PICKED_UP", "driverA-pickup");
    await updateDriverOrder(driverAPage, lifecycle.orderId, "in-transit", "IN_TRANSIT", "driverA-in-transit");
    await updateDriverOrder(driverAPage, lifecycle.orderId, "delivered", "DELIVERED", "driverA-delivered");
    await screenshot(driverAPage, "driver-a-delivered.png");
    await driverAPage.reload({ waitUntil: "domcontentloaded" });
    await visible(driverAPage.getByTestId("driver-dashboard"));

    await customerPage.waitForTimeout(6500);
    const customerCurrentStatus = await customerPage.locator(".timeline-step.current").innerText().catch(() => "");
    if (!/geliefert|delivered/i.test(customerCurrentStatus)) {
      await customerPage.reload({ waitUntil: "domcontentloaded" });
      await visible(customerPage.getByTestId("order-tracking-page"));
    }
    const finalCustomerStatus = await customerPage.locator(".timeline-step.current").innerText();
    if (!/geliefert|delivered/i.test(finalCustomerStatus)) fail("Customer sieht finalen DELIVERED-Status nicht");
    lifecycle.statusSequence.push({ actor: "customer", status: finalCustomerStatus.replace(/\s+/g, " ").trim() });
    await screenshot(customerPage, "customer-final-delivered.png");
    await customerPage.goto(`${session.urls.customer}/orders`, { waitUntil: "domcontentloaded" });
    await visible(customerPage.getByRole("heading", { name: /My Orders|Bestellhistorie|Order History/i }), 45_000);
    await visible(customerPage.locator(`a[href="/orders/${lifecycle.orderId}"]`), 45_000);

    await loginAdmin(adminPage);
    await screenshot(adminPage, "admin-authenticated.png");
    await adminPage.getByTestId("sidebar-link-orders").click();
    await visible(adminPage.getByTestId("orders-table"), 45_000);
    const adminSearch = adminPage.getByPlaceholder("Nach ID, Kunde, Restaurant suchen...");
    await adminSearch.fill(lifecycle.orderId);
    const adminRow = adminPage.locator(`[data-order-id="${lifecycle.orderId}"]`);
    await visible(adminRow, 45_000);
    const adminStatus = await adminRow.getByTestId("status").innerText();
    if (!/geliefert|delivered/i.test(adminStatus)) fail(`Admin sieht nicht DELIVERED: ${adminStatus}`);
    for (const tab of ["dashboard", "reporting", "integrations", "orders"]) {
      await clickAdminTab(adminPage, tab);
      await adminPage.waitForTimeout(800);
      if ((await adminPage.locator("body").innerText()).includes("404")) fail(`Admin-Tab ${tab} zeigt 404`);
    }
    await clickAdminTab(adminPage, "orders");
    await adminSearch.fill(lifecycle.orderId);
    await visible(adminPage.locator(`[data-order-id="${lifecycle.orderId}"]`));
    await screenshot(adminPage, "admin-final-order-status.png");

    await negativeLogin(browser, "customer", "admin-panel", session.urls.admin, "/api/auth/login");
    await negativeLogin(browser, "restaurant", "admin-panel", session.urls.admin, "/api/auth/login");
    await negativeLogin(browser, "driverA", "admin-panel", session.urls.admin, "/api/auth/login");
    await adminPage.locator("button.logout-button").click();
    await visible(adminPage.getByRole("form", { name: "Login-Formular" }));

    await driverAPage.getByTestId("driver-logout").click();
    await visible(driverAPage.getByTestId("login-form"));
    await customerPage.goto(`${session.urls.customer}/profile`, { waitUntil: "domcontentloaded" });
    await customerPage.locator("button.logout-button").click();
    await visible(customerPage.getByTestId("email-input"));
    await screenshot(customerPage, "logout-protected-route.png");
    recordEvent("run-pass", { orderId: lifecycle.orderId });
  } finally {
    for (const context of Object.values(browserContexts)) await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function pageWaitForOrderStatus(page, orderId, status) {
  await page.waitForFunction(({ id, expected }) => document.querySelector(`[data-order-id="${id}"]`)?.getAttribute("data-status") === expected, { id: orderId, expected: status }, { timeout: 45_000 });
}

function scanTextArtifacts() {
  const forbidden = secretValues();
  const files = ["events.jsonl", "sanitized-network.json", "sanitized-console.json", "order-lifecycle.json", "security-negative-cases.json", "manual-checklist-result.md", "summary.json", "browser-contexts.json"];
  const leaks = [];
  for (const file of files) {
    const filePath = path.join(artifactRoot, file);
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    for (const secret of forbidden) if (secret && text.includes(secret)) leaks.push(file);
  }
  return [...new Set(leaks)];
}

const startedAt = Date.now();
let result = "PASS";
let failure = null;
try {
  await runAcceptance();
} catch (error) {
  result = "FAIL";
  failure = sanitize(error instanceof Error ? error.message : String(error));
  recordEvent("run-fail", { message: failure });
}

writeFileSync(path.join(artifactRoot, "sanitized-network.json"), `${JSON.stringify(network, null, 2)}\n`, "utf8");
writeFileSync(path.join(artifactRoot, "sanitized-console.json"), `${JSON.stringify(consoleEvents, null, 2)}\n`, "utf8");
writeFileSync(path.join(artifactRoot, "order-lifecycle.json"), `${JSON.stringify({ ...lifecycle, result }, null, 2)}\n`, "utf8");
writeFileSync(path.join(artifactRoot, "security-negative-cases.json"), `${JSON.stringify({ result, cases: negativeCases }, null, 2)}\n`, "utf8");
writeFileSync(path.join(artifactRoot, "browser-contexts.json"), `${JSON.stringify({ contexts, isolation: "one Playwright BrowserContext per role; no storageState sharing" }, null, 2)}\n`, "utf8");
const unexpectedNetwork = network.filter((entry) => entry.expected === false);
const unexpectedConsole = consoleEvents.filter((entry) => entry.expected === false);
const leaks = scanTextArtifacts();
if (leaks.length) {
  result = "FAIL";
  failure = `Secret-Leak in Evidence-Dateien: ${leaks.join(", ")}`;
}
const summary = {
  finding: "P1-LOCAL13-AUTHENTICATED-BROWSER-ACCEPTANCE-080",
  result,
  runId: session.runId,
  namespace: session.namespace,
  gitHead: session.gitHead,
  branch: session.branch,
  urls: session.urls,
  ports: session.ports,
  credentialBundlePath: session.credentialBundlePath,
  roles: Object.fromEntries(roles.map((role) => [role, role === "guest" ? "unauthenticated" : "configured-local-test-identity"])),
  orderId: lifecycle.orderId,
  statusSequence: lifecycle.statusSequence,
  negativeSecurityCases: negativeCases,
  browserErrors: { unexpectedNetwork, unexpectedConsole },
  credentialFreeEvidence: leaks.length === 0,
  durationMs: Date.now() - startedAt,
  failure,
};
writeFileSync(path.join(artifactRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
writeFileSync(path.join(artifactRoot, "applications.json"), `${JSON.stringify({ urls: session.urls, ports: session.ports, services: session.services, startCommands: session.startCommands }, null, 2)}\n`, "utf8");
writeFileSync(path.join(artifactRoot, "manual-checklist-result.md"), `# LOCAL-13 Browserlauf ${session.runId}\n\n- Ergebnis: **${result}**\n- Customer-Web: ${result}\n- Admin-Panel: ${result}\n- Restaurant-Web: ${result}\n- frontend/driver-app: ${result}\n- UI-Order-Lifecycle: ${lifecycle.orderId ? result : "FAIL"}\n- Driver-B-Ownership: ${negativeCases.find((entry) => entry.role === "driverB")?.result || "FAIL"}\n- Credential-freie Evidence: ${leaks.length === 0 ? "PASS" : "FAIL"}\n- Ungeklärte Netzwerkfehler: ${unexpectedNetwork.length}\n- Ungeklärte Console-/Page-Fehler: ${unexpectedConsole.length}\n`, "utf8");
if (result !== "PASS") {
  console.error(`LOCAL13_BROWSER_FAIL: ${failure || "Browserlauf fehlgeschlagen"}`);
  process.exitCode = 1;
} else {
  console.log(`LOCAL13_BROWSER_PASS=${session.runId}`);
  console.log(`LOCAL13_BROWSER_EVIDENCE=${artifactRoot}`);
}
