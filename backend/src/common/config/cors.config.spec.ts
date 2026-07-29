import {
  createCorsOriginValidator,
  isAllowedCorsOrigin,
  resolveCorsOrigins,
} from "./cors.config";

const allowedOrigins = [
  "http://127.0.0.1:3102",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  "http://127.0.0.1:3004",
];

describe("CORS origin policy", () => {
  it("uses the explicit local UberFoods origins for development", () => {
    expect(resolveCorsOrigins(undefined, "development")).toEqual(
      allowedOrigins,
    );
  });

  it("allows each configured local frontend and requests without an Origin header", () => {
    for (const origin of allowedOrigins) {
      expect(isAllowedCorsOrigin(origin, allowedOrigins)).toBe(true);
    }

    expect(isAllowedCorsOrigin(undefined, allowedOrigins)).toBe(true);
  });

  it.each([
    "https://unexpected.invalid",
    "http://localhost:9999",
    "http://127.0.0.1:9999",
    "http://127.0.0.1:3102.evil.invalid",
    "https://127.0.0.1:3102",
    "null",
    "http://127.0.0.1:3102/",
    "http://127.0.0.1:3102,https://unexpected.invalid",
  ])("rejects manipulated or unconfigured origin %s", (origin) => {
    expect(isAllowedCorsOrigin(origin, allowedOrigins)).toBe(false);
  });

  it("rejects wildcard and path-bearing configured origins", () => {
    expect(() => resolveCorsOrigins("*", "development")).toThrow(
      "Invalid CORS origin configuration",
    );
    expect(() =>
      resolveCorsOrigins("http://127.0.0.1:3102/path", "development"),
    ).toThrow("Invalid CORS origin configuration");
  });

  it("uses the same exact-origin decision for callback consumers", () => {
    const validator = createCorsOriginValidator(allowedOrigins);
    const allowed = jest.fn();
    const rejected = jest.fn();

    validator("http://127.0.0.1:3002", allowed);
    validator("https://unexpected.invalid", rejected);

    expect(allowed).toHaveBeenCalledWith(null, true);
    expect(rejected.mock.calls[0][0]).toHaveProperty(
      "message",
      "Not allowed by CORS",
    );
  });
});
