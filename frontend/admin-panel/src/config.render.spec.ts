const STAGING = {
  PROD: "true",
  DEV: "false",
  VITE_API_URL: "https://uberfoods-backend-staging.onrender.com",
  VITE_WS_URL: "wss://uberfoods-backend-staging.onrender.com",
  VITE_CUSTOMER_WEB_URL:
    "https://uberfoods-customer-web-staging.onrender.com",
  VITE_DRIVER_APP_URL: "https://uberfoods-driver-app-staging.onrender.com",
  VITE_RESTAURANT_WEB_URL:
    "https://uberfoods-restaurant-web-staging.onrender.com",
};

const originalEnvironment = process.env;

describe("Render staging Admin configuration", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnvironment, ...STAGING };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it("uses the explicit HTTPS staging deep links", () => {
    const { config } = require("./config");

    expect(config).toEqual(
      expect.objectContaining({
        apiUrl: STAGING.VITE_API_URL,
        wsUrl: STAGING.VITE_WS_URL,
        customerWebUrl: STAGING.VITE_CUSTOMER_WEB_URL,
        driverAppUrl: STAGING.VITE_DRIVER_APP_URL,
        restaurantWebUrl: STAGING.VITE_RESTAURANT_WEB_URL,
      }),
    );
  });

  it.each([
    "VITE_CUSTOMER_WEB_URL",
    "VITE_DRIVER_APP_URL",
    "VITE_RESTAURANT_WEB_URL",
  ])("fails closed when %s is missing from production", (key) => {
    delete process.env[key];

    expect(() => require("./config")).toThrow(
      `Missing required environment variable: ${key}`,
    );
  });

  it("rejects a local production deep link", () => {
    process.env.VITE_DRIVER_APP_URL = "http://localhost:3004";

    expect(() => require("./config")).toThrow(
      "Local production URL is forbidden: VITE_DRIVER_APP_URL",
    );
  });

  it("supports same-origin proxy paths for the isolated production simulation", () => {
    jest.resetModules();
    process.env = {
      ...originalEnvironment,
      PROD: "true",
      DEV: "false",
      VITE_API_URL: "/api",
      VITE_WS_URL: "/socket.io",
      VITE_CUSTOMER_WEB_URL: "https://customer.example.test",
      VITE_DRIVER_APP_URL: "https://driver.example.test",
      VITE_RESTAURANT_WEB_URL: "https://restaurant.example.test",
    };

    const { config } = require("./config");

    expect(config.apiUrl).toBe("");
    expect(config.wsUrl).toBe(window.location.origin);
  });
});
