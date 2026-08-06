import { expect, test, type Page } from "@playwright/test";

const restaurantEmail = (
  process.env.RESTAURANT_TEST_EMAIL || "restaurant@uberfoods.local"
).trim();
const restaurantPassword = process.env.RESTAURANT_TEST_PASSWORD?.trim();

if (!restaurantPassword) {
  throw new Error(
    "RESTAURANT_TEST_PASSWORD is required; use the password of the official local restaurant seed account.",
  );
}

type Phase =
  | "startup"
  | "unauthenticated"
  | "invalid-session"
  | "authenticated"
  | "post-logout";

function unwrapLoginUser(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("LOCAL-07 login response is not an object.");
  }
  const envelope = payload as Record<string, unknown>;
  const data =
    envelope.success === true &&
    envelope.data &&
    typeof envelope.data === "object" &&
    !Array.isArray(envelope.data)
      ? (envelope.data as Record<string, unknown>)
      : envelope;
  const user = data.user;
  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new Error("LOCAL-07 login response does not contain a user.");
  }
  return user as Record<string, unknown>;
}

async function openSection(page: Page, label: RegExp, heading: RegExp) {
  await page.getByRole("button", { name: label }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.locator(".loading")).toHaveCount(0);
}

async function readMenuItemAvailability(
  page: Page,
  restaurantId: string,
  dishId: string,
) {
  return page.evaluate(
    async ({ restaurantId, dishId }) => {
      const token = localStorage.getItem("restaurant_token");
      const response = await fetch(
        `/api/restaurants/${restaurantId}/menu/${dishId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      const payload = (await response.json()) as unknown;
      const item =
        payload &&
        typeof payload === "object" &&
        "data" in payload &&
        payload.data &&
        typeof payload.data === "object"
          ? payload.data
          : payload;
      const itemRecord =
        item && typeof item === "object"
          ? (item as { isAvailable?: unknown })
          : {};
      return {
        status: response.status,
        isAvailable: itemRecord.isAvailable,
      };
    },
    { restaurantId, dishId },
  );
}

test.describe("LOCAL-07 Restaurant-Web contract", () => {
  test("covers authenticated restaurant web without the LOCAL-10 lifecycle", async ({
    page,
  }) => {
    const baseUrl = process.env.RESTAURANT_WEB_BASE_URL || process.env.BASE_URL;
    if (!baseUrl) throw new Error("LOCAL-07 requires Playwright baseURL.");
    console.log(`[LOCAL-07] Restaurant-Web base URL: ${baseUrl}`);

    let phase: Phase = "startup";
    const consoleErrors: string[] = [];
    const expectedNegativeAuthConsoleErrors: string[] = [];
    const knownFrameworkWarnings: string[] = [];
    const relevantWarnings: string[] = [];
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    const unexpectedResponses: string[] = [];
    const authMeStatuses: number[] = [];
    const restaurantMeStatuses: number[] = [];
    const loginRequests: string[] = [];
    const logoutRequests: string[] = [];
    const protectedRequests: string[] = [];
    const websocketUrls: string[] = [];
    const websocketErrors: string[] = [];
    const faviconRequests: string[] = [];
    const viteFaviconRequests: string[] = [];
    let initialAvailability: string | null = null;
    let initialIsAvailable = false;
    let menuDishId = "";
    let menuDishName = "";

    page.on("console", (message) => {
      if (message.type() === "error") {
        const text = message.text();
        if (
          (phase === "invalid-session" || phase === "post-logout") &&
          /(401|Unauthorized)/i.test(text)
        ) {
          expectedNegativeAuthConsoleErrors.push(text);
        } else {
          consoleErrors.push(text);
        }
      }
      if (message.type() === "warning") {
        const text = message.text();
        if (/React Router Future Flag Warning/i.test(text)) {
          knownFrameworkWarnings.push(text);
        } else {
          relevantWarnings.push(text);
        }
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      requestFailures.push(
        `${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}`,
      );
    });
    page.on("websocket", (websocket) => {
      websocketUrls.push(websocket.url());
      websocket.on("socketerror", (error) => {
        websocketErrors.push(`${websocket.url()} :: ${error}`);
      });
    });
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.endsWith("/vite.svg"))
        viteFaviconRequests.push(request.url());
      if (url.pathname.endsWith("/icon.svg"))
        faviconRequests.push(request.url());
      if (
        request.method() === "POST" &&
        url.pathname.endsWith("/auth/restaurant/login")
      ) {
        loginRequests.push(request.url());
      }
      if (
        request.method() === "POST" &&
        url.pathname.endsWith("/auth/logout")
      ) {
        logoutRequests.push(request.url());
      }
      if (
        url.pathname.startsWith("/api/restaurants/") ||
        url.pathname.startsWith("/api/orders/") ||
        url.pathname.startsWith("/api/meal-planner/")
      ) {
        protectedRequests.push(`${request.method()} ${url.pathname}`);
      }
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      const status = response.status();
      if (url.pathname.endsWith("/auth/me")) authMeStatuses.push(status);
      if (url.pathname.endsWith("/restaurants/me"))
        restaurantMeStatuses.push(status);

      const isExpectedNegativeAuth =
        status === 401 &&
        (phase === "unauthenticated" ||
          phase === "invalid-session" ||
          phase === "post-logout") &&
        (url.pathname.endsWith("/auth/me") ||
          url.pathname.endsWith("/auth/restaurant/login") ||
          url.pathname.endsWith("/auth/logout"));
      if ((status === 401 || status === 403) && !isExpectedNegativeAuth) {
        unexpectedResponses.push(
          `${status} ${response.request().method()} ${url.pathname}`,
        );
      }
      if (status === 404 || status === 500) {
        unexpectedResponses.push(
          `${status} ${response.request().method()} ${url.pathname}`,
        );
      }
    });

    await test.step("favicon and unauthenticated route", async () => {
      phase = "unauthenticated";
      await page.goto("/login");
      await expect(
        page.getByRole("heading", { name: "Restaurant Login" }),
      ).toBeVisible();
      await expect(page.locator("form.login-form")).toBeVisible();
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
        "href",
        "/icon.svg",
      );
      const favicon = await page.request.get(
        new URL("/icon.svg", baseUrl).toString(),
      );
      expect(favicon.status(), "GET /icon.svg").toBe(200);
      faviconRequests.push(favicon.url());
      expect(viteFaviconRequests).toEqual([]);

      const protectedBefore = protectedRequests.length;
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "Restaurant Login" }),
      ).toBeVisible();
      expect(protectedRequests.length).toBe(protectedBefore);
    });

    await test.step("invalid stored session is cleared", async () => {
      phase = "invalid-session";
      await page.evaluate(() => {
        localStorage.setItem("restaurant_token", "local07-invalid-token");
        localStorage.setItem(
          "restaurant_user",
          JSON.stringify({
            id: "local07-invalid-session",
            email: "invalid-session@example.test",
            role: "restaurant",
          }),
        );
        localStorage.setItem("restaurant_id", "local07-invalid-session");
      });
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.locator("form.login-form")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => localStorage.getItem("restaurant_token")),
        )
        .toBeNull();
      await expect
        .poll(() =>
          page.evaluate(() => localStorage.getItem("restaurant_user")),
        )
        .toBeNull();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("restaurant_id")))
        .toBeNull();
      expect(authMeStatuses.filter((status) => status === 401).length).toBe(1);
    });

    let restaurantId = "";
    await test.step("real login and valid session restoration", async () => {
      phase = "authenticated";
      await page.locator('input[type="email"]').fill(restaurantEmail);
      await page.locator('input[type="password"]').fill(restaurantPassword);
      const loginResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname.endsWith("/auth/restaurant/login"),
      );
      await page.getByRole("button", { name: "Anmelden" }).click();
      const loginResponse = await loginResponsePromise;
      expect([200, 201]).toContain(loginResponse.status());
      const loginUser = unwrapLoginUser(await loginResponse.json());
      restaurantId = String(loginUser.id || loginUser.sub || "");
      expect(restaurantId).not.toBe("");
      expect(loginRequests).toHaveLength(1);
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.evaluate((id) => {
        localStorage.setItem(`restaurant_onboarding_done_${id}`, "true");
      }, restaurantId);
      const authMeBeforeReload = authMeStatuses.length;
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      expect(authMeStatuses.slice(authMeBeforeReload)).toEqual([200]);
      const restaurantMeStatus = await page.evaluate(async () => {
        const token = localStorage.getItem("restaurant_token");
        const response = await fetch("/api/restaurants/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return response.status;
      });
      expect(restaurantMeStatus).toBe(200);
      expect(restaurantMeStatuses).toContain(200);
      expect(
        await page.evaluate(() => localStorage.getItem("restaurant_id")),
      ).toBe(restaurantId);
    });

    await test.step("restaurant sections", async () => {
      await openSection(page, /Menü/, /Menü-Verwaltung/);
      const firstDish = page.locator(".dish-card").first();
      await expect(firstDish).toBeVisible();
      const availabilityButton = firstDish
        .getByRole("button", { name: /Verfügbarkeit/ })
        .first();
      menuDishName =
        (await firstDish.locator("h3").textContent())?.trim() || "";
      expect(menuDishName).not.toBe("");
      initialAvailability = await availabilityButton.textContent();
      expect(initialAvailability).toMatch(/Verfügbarkeit (aus|an)/);
      initialIsAvailable = initialAvailability.includes("aus");

      const toggleResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "PUT" &&
          /\/api\/restaurants\/[^/]+\/menu\/[^/]+$/.test(
            new URL(response.url()).pathname,
          ),
      );
      await availabilityButton.click();
      const toggleResponse = await toggleResponsePromise;
      expect([200, 201]).toContain(toggleResponse.status());
      menuDishId =
        new URL(toggleResponse.url()).pathname.split("/").pop() || "";
      expect(menuDishId).not.toBe("");
      await expect(
        page.getByText("Gericht erfolgreich aktualisiert!"),
      ).toBeVisible();
      const serverAfterToggle = await readMenuItemAvailability(
        page,
        restaurantId,
        menuDishId,
      );
      expect(serverAfterToggle.status).toBe(200);
      expect(serverAfterToggle.isAvailable).toBe(!initialIsAvailable);
    });

    await test.step("menu mutation persistence and reset", async () => {
      const toggledDish = page
        .locator(".dish-card")
        .filter({ hasText: menuDishName })
        .first();
      const toggledAvailability = toggledDish
        .getByRole("button", { name: /Verfügbarkeit/ })
        .first();
      await expect(toggledAvailability).toHaveText(/Verfügbarkeit (an|aus)/);
      await expect(toggledAvailability).toHaveText(
        initialIsAvailable ? "Verfügbarkeit an" : "Verfügbarkeit aus",
      );

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      await openSection(page, /Menü/, /Menü-Verwaltung/);
      const persistedButton = page
        .locator(".dish-card")
        .filter({ hasText: menuDishName })
        .first()
        .getByRole("button", { name: /Verfügbarkeit/ })
        .first();
      await expect(persistedButton).toHaveText(
        initialIsAvailable ? "Verfügbarkeit an" : "Verfügbarkeit aus",
      );
      const serverAfterReload = await readMenuItemAvailability(
        page,
        restaurantId,
        menuDishId,
      );
      expect(serverAfterReload.status).toBe(200);
      expect(serverAfterReload.isAvailable).toBe(!initialIsAvailable);

      const resetResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "PUT" &&
          /\/api\/restaurants\/[^/]+\/menu\/[^/]+$/.test(
            new URL(response.url()).pathname,
          ),
      );
      await persistedButton.click();
      const resetResponse = await resetResponsePromise;
      expect([200, 201]).toContain(resetResponse.status());
      expect(new URL(resetResponse.url()).pathname.endsWith(menuDishId)).toBe(
        true,
      );
      await expect(
        page.getByText("Gericht erfolgreich aktualisiert!"),
      ).toBeVisible();
      const serverAfterReset = await readMenuItemAvailability(
        page,
        restaurantId,
        menuDishId,
      );
      expect(serverAfterReset.status).toBe(200);
      expect(serverAfterReset.isAvailable).toBe(initialIsAvailable);

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      await openSection(page, /Menü/, /Menü-Verwaltung/);
      const resetDish = page
        .locator(".dish-card")
        .filter({ hasText: menuDishName })
        .first();
      await expect(
        resetDish.locator("button").filter({
          hasText: initialIsAvailable
            ? "Verfügbarkeit aus"
            : "Verfügbarkeit an",
        }),
      ).toBeVisible();
    });

    await test.step("orders, KDS, locations, meal planner, analytics and reporting", async () => {
      await openSection(page, /Bestellungen/, /Bestellungen \(/);
      await openSection(
        page,
        /Küche \(KDS\)/,
        /Kitchen Display System \(KDS\)/,
      );
      await openSection(page, /Standorte/, /Multi-Standort-Verwaltung/);
      await openSection(page, /Meal Planner/, /Meal Planner/);
      await openSection(page, /Analytics/, /Erweiterte Analytics/);
      await openSection(page, /Berichte/, /Erweiterte Berichte/);
    });

    await test.step("logout, protected-route rejection and re-login", async () => {
      phase = "post-logout";
      const logoutResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname.endsWith("/auth/logout"),
      );
      const protectedBeforeLogout = protectedRequests.length;
      await page.getByRole("button", { name: "Abmelden" }).click();
      expect([200, 201, 204]).toContain((await logoutResponsePromise).status());
      expect(logoutRequests).toHaveLength(1);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.locator("form.login-form")).toBeVisible();
      expect(protectedRequests.length).toBe(protectedBeforeLogout);
      expect(
        await page.evaluate(() => localStorage.getItem("restaurant_token")),
      ).toBeNull();

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login$/);
      expect(protectedRequests.length).toBe(protectedBeforeLogout);

      await page.locator('input[type="email"]').fill(restaurantEmail);
      await page.locator('input[type="password"]').fill(restaurantPassword);
      const reloginResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname.endsWith("/auth/restaurant/login"),
      );
      await page.getByRole("button", { name: "Anmelden" }).click();
      expect([200, 201]).toContain((await reloginResponsePromise).status());
      expect(loginRequests).toHaveLength(2);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
    });

    expect(
      websocketUrls.length,
      "WebSocket connection was not observed",
    ).toBeGreaterThan(0);
    expect(websocketErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(expectedNegativeAuthConsoleErrors.length).toBeGreaterThan(0);
    expect(
      knownFrameworkWarnings.every((warning) =>
        /React Router Future Flag Warning/i.test(warning),
      ),
    ).toBe(true);
    expect(relevantWarnings).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
    expect(unexpectedResponses).toEqual([]);
    expect(faviconRequests.length).toBeGreaterThan(0);
    expect(viteFaviconRequests).toEqual([]);
  });
});
