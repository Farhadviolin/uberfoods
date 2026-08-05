import { resolveExplicitE2EDatabaseUrl } from "./e2e-database-url";

describe("resolveExplicitE2EDatabaseUrl", () => {
  it("rejects a missing explicit database URL", () => {
    expect(() => resolveExplicitE2EDatabaseUrl({})).toThrow(
      "refusing Prisma's implicit .env fallback",
    );
  });

  it("prefers the dedicated E2E database URL", () => {
    expect(
      resolveExplicitE2EDatabaseUrl({
        E2E_DATABASE_URL: "postgresql://e2e-user:e2e-pass@127.0.0.1:62903/e2e",
        DATABASE_URL: "postgresql://wrong:wrong@127.0.0.1:5432/wrong",
      }),
    ).toContain(":62903/");
  });

  it("rejects malformed database URLs", () => {
    expect(() =>
      resolveExplicitE2EDatabaseUrl({ E2E_DATABASE_URL: "not-a-url" }),
    ).toThrow("valid PostgreSQL URL");
  });
});
