export function resolveExplicitE2EDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const databaseUrl = env.E2E_DATABASE_URL?.trim() || env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL or DATABASE_URL must be explicitly set; refusing Prisma's implicit .env fallback.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("E2E database URL must be a valid PostgreSQL URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("E2E database URL must use the postgres:// protocol.");
  }

  return databaseUrl;
}
