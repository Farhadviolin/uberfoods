const LOCAL_DEVELOPMENT_CORS_ORIGINS = [
  "http://127.0.0.1:3102",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  "http://127.0.0.1:3004",
] as const;

const HTTP_CORS_OPTIONS = {
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
} as const;

function normalizeConfiguredOrigin(origin: string): string {
  let parsed: URL;

  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid CORS origin configuration: ${origin}`);
  }

  if (
    parsed.origin !== origin ||
    !["http:", "https:"].includes(parsed.protocol)
  ) {
    throw new Error(`Invalid CORS origin configuration: ${origin}`);
  }

  return parsed.origin;
}

export function resolveCorsOrigins(
  configuredOrigins = process.env.ALLOWED_ORIGINS,
  nodeEnv = process.env.NODE_ENV,
): string[] {
  const rawOrigins = configuredOrigins
    ? configuredOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : nodeEnv === "production"
      ? (() => {
          throw new Error(
            "ALLOWED_ORIGINS environment variable is required in production.",
          );
        })()
      : [...LOCAL_DEVELOPMENT_CORS_ORIGINS];

  const origins = rawOrigins.map(normalizeConfiguredOrigin);

  if (origins.length === 0) {
    throw new Error("At least one CORS origin must be configured.");
  }

  return [...new Set(origins)];
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (origin === undefined) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}

export function createCorsOriginValidator(allowedOrigins: readonly string[]) {
  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    if (isAllowedCorsOrigin(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  };
}

export function createHttpCorsOptions(allowedOrigins: readonly string[]) {
  return {
    ...HTTP_CORS_OPTIONS,
    origin: createCorsOriginValidator(allowedOrigins),
  };
}

export function createSocketCorsOptions(allowedOrigins: readonly string[]) {
  return {
    origin: createCorsOriginValidator(allowedOrigins),
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

export function createSocketAllowRequest(allowedOrigins: readonly string[]) {
  return (
    request: { headers: { origin?: string | string[] } },
    callback: (error: string | null, allow: boolean) => void,
  ) => {
    const origin = request.headers.origin;
    callback(
      null,
      isAllowedCorsOrigin(
        typeof origin === "string" ? origin : undefined,
        allowedOrigins,
      ),
    );
  };
}
