import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { SocketIOAdapter } from "./common/adapters/socket-io.adapter";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import * as helmet from "helmet";
import * as express from "express";
import * as compression from "compression";
import { join } from "path";
import * as fs from "fs";
import * as Sentry from "@sentry/node";
import { validateStripeConfig } from "./config/stripe.validation";

function validateEnv() {
  // Always required in ALL environments (fail-fast)
  const requiredAlways = ["JWT_SECRET", "DATABASE_URL"];

  // Required only in production
  const requiredProdOnly = [
    "ALLOWED_ORIGINS",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_BASIC",
    "STRIPE_PRICE_PRO",
    "STRIPE_PRICE_FULLTIME",
    "STRIPE_PRICE_ENTERPRISE",
    "PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET",
    "PAYPAL_WEBHOOK_ID",
  ];

  const recommended = [
    "APPLE_MERCHANT_ID",
    "GOOGLE_PAY_MERCHANT_ID",
    "SENDGRID_API_KEY",
    "SMTP_HOST",
    "SMS_PROVIDER",
  ];

  const missingAlways = requiredAlways.filter((key) => !process.env[key]);
  if (missingAlways.length > 0) {
    // Always fail-fast for critical infrastructure variables
    // eslint-disable-next-line no-console
    console.error(
      `Missing critical environment variables: ${missingAlways.join(", ")}`,
    );
    process.exit(1);
  }

  // Production-only requirements
  const missingProdOnly = requiredProdOnly.filter((key) => !process.env[key]);
  if (missingProdOnly.length > 0 && process.env.NODE_ENV === "production") {
    // fail fast in production if production-specific secrets are missing
    // eslint-disable-next-line no-console
    console.error(
      `Missing production-required environment variables: ${missingProdOnly.join(", ")}`,
    );
    process.exit(1);
  }

  const shouldValidateStripe =
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "e2e" ||
    process.env.NODE_ENV === "test";
  if (shouldValidateStripe) {
    validateStripeConfig(process.env);
  }

  // Optional warnings for development
  if (process.env.NODE_ENV !== "production") {
    if (missingProdOnly.includes("ALLOWED_ORIGINS")) {
      // eslint-disable-next-line no-console
      console.warn(
        `ALLOWED_ORIGINS not set - using localhost defaults for development`,
      );
    }
  }

  const missingRecommended = recommended.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `Recommended environment variables not set: ${missingRecommended.join(", ")}`,
    );
  }
}

async function bootstrap() {
  console.log(
    `[E2E-BACKEND] Bootstrap starting, NODE_ENV="${process.env.NODE_ENV}", E2E_AUTH_DEBUG="${process.env.E2E_AUTH_DEBUG}"`,
  );
  validateEnv();
  // Sentry Initialisierung (vor App-Erstellung)
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || "development",
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      // Profiling Sample Rate
      profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      // Release Tracking
      release: process.env.APP_VERSION || "1.0.0",
      // Error Filtering
      beforeSend(event, hint) {
        // Filtere bekannte Development-Fehler
        if (process.env.NODE_ENV !== "production") {
          const error = hint.originalException;
          if (error && typeof error === "object" && "message" in error) {
            const errorMessage = error.message;
            // Ignoriere bestimmte Development-Fehler
            if (
              typeof errorMessage === "string" &&
              (errorMessage.includes("Mock") ||
                errorMessage.includes("Development"))
            ) {
              return null;
            }
          }
        }
        return event;
      },
    });
  }

  const app = await NestFactory.create(AppModule);
  console.log("[BOOT] BUILD_ID=DRIVER-ROUTES-20251222-2250");
  const configService = app.get(ConfigService);

  // Socket.IO Adapter für WebSocket-Unterstützung mit Redis-Skalierung
  const { RedisSocketAdapter } =
    await import("./common/adapters/redis-socket.adapter");
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_SOCKET_URL;
  app.useWebSocketAdapter(new RedisSocketAdapter(app, redisUrl));

  // Globaler API Prefix - alle Routen werden mit /api prefixiert
  app.setGlobalPrefix("api");

  // CORS konfigurieren - Production-ready
  const allowedOrigins = configService.get<string>("ALLOWED_ORIGINS");
  const corsOrigins = allowedOrigins
    ? allowedOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : process.env.NODE_ENV === "production"
      ? (() => {
          // Production ohne ALLOWED_ORIGINS: Fehler statt Fallback
          throw new Error(
            "ALLOWED_ORIGINS environment variable is required in production. " +
              "Set it to a comma-separated list of allowed origins (e.g., 'https://yourdomain.com,https://admin.yourdomain.com')",
          );
        })()
      : [
          "http://localhost:3102", // Customer Web
          "http://localhost:3002", // Admin Panel
          "http://localhost:3003", // Restaurant Web
          "http://localhost:3004", // Driver App
          "http://localhost:5173", // Vite Default Port
        ];

  app.enableCors({
    origin: (origin, callback) => {
      // In Development: Erlaube alle Origins (inkl. null für curl-Requests)
      if (process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }

      // In Production:
      // - undefined origin (kein Origin-Header, z.B. curl/server-to-server) = erlauben
      // - "null" string (ungültiger Origin-Header) = blocken (Sicherheitsrisiko)
      // - gültige Origins aus ALLOWED_ORIGINS = erlauben
      if (origin === undefined || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Security Headers (Helmet) mit Stripe-kompatibler CSP (gehärtet: ohne unsafe-eval)
  app.use(
    helmet.default({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                  "'self'",
                  "'unsafe-inline'",
                  "https://js.stripe.com",
                  "https://m.stripe.network",
                  "blob:",
                ],
                styleSrc: [
                  "'self'",
                  "'unsafe-inline'",
                  "https://js.stripe.com",
                  "https://fonts.googleapis.com",
                  "https://fonts.gstatic.com",
                  "blob:",
                ],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
                frameSrc: [
                  "'self'",
                  "https://js.stripe.com",
                  "https://hooks.stripe.com",
                ],
                workerSrc: ["'self'", "blob:"],
                childSrc: ["'self'", "blob:"],
                connectSrc: [
                  "'self'",
                  "http://localhost:3000",
                  "ws://localhost:3000",
                  "wss://localhost:3000",
                  "https://api.stripe.com",
                  "https://m.stripe.network",
                ],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
              },
            }
          : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Performance: Response Compression
  app.use(
    compression({
      level: 6, // Balanced compression level
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  // Sentry Request Handler (muss vor anderen Middleware sein)
  if (sentryDsn) {
    // Sentry Handlers werden automatisch durch @sentry/node integriert
    // Request/Error Handling erfolgt über den Exception Filter
  }

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors
  const { LoggingInterceptor } =
    await import("./common/interceptors/logging.interceptor");
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Validation mit Sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Raw Body für Stripe Webhooks
  app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
  app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

  // Request-ID Middleware (muss ganz früh sein)
  const { RequestIdMiddleware } =
    await import("./common/middleware/request-id.middleware");
  app.use(new RequestIdMiddleware().use);

  // Security Middleware
  const { SecurityMiddleware } =
    await import("./common/middleware/security.middleware");
  const { EncryptionUtil } = await import("./common/utils/encryption.util");
  const encryptionUtil = new EncryptionUtil(configService);
  const securityMiddleware = new SecurityMiddleware();
  app.use((req: any, res: any, next: any) =>
    securityMiddleware.use(req, res, next),
  );

  // Swagger/OpenAPI Dokumentation
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_SWAGGER === "true"
  ) {
    const config = new DocumentBuilder()
      .setTitle("UberFoods API")
      .setDescription(
        "Food Delivery Platform API Dokumentation - Vollständige API-Referenz für alle Frontend-Apps",
      )
      .setVersion("1.0")
      .addServer("http://localhost:3000", "Development Server")
      .addServer("https://api.uberfoods.com", "Production Server")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter JWT token",
          in: "header",
        },
        "JWT-auth",
      )
      .addTag("auth", "Authentifizierung")
      .addTag("restaurants", "Restaurant-Verwaltung")
      .addTag("dishes", "Gericht-Verwaltung")
      .addTag("orders", "Bestellungen")
      .addTag("customers", "Kunden")
      .addTag("drivers", "Fahrer")
      .addTag("payments", "Zahlungen")
      .addTag("reviews", "Bewertungen")
      .addTag("statistics", "Statistiken")
      .addTag("social", "Social Food Network")
      .addTag("gamification", "Gamification")
      .addTag("group-orders", "Gruppenbestellungen")
      .addTag("meal-planner", "Meal Planner")
      .addTag("nutrition", "Nutrition Tracker")
      .addTag("analytics", "Analytics & Predictions")
      .addTag("inventory", "Inventory Management")
      .addTag("staff", "Staff Management")
      .addTag("accounting", "Accounting & Finance")
      .addTag("chat", "Chat & Communication")
      .addTag("admin", "Admin Management")
      .addTag("monitoring", "Monitoring & Health")
      .addTag("rbac", "Role-Based Access Control")
      .addTag("automation", "Automation")
      .addTag("integrations", "Integrations")
      .addTag("reporting", "Reporting")
      .addTag("multi-tenancy", "Multi-Tenancy")
      .addTag("ai-ml", "AI/ML Services")
      .addTag("websocket", "WebSocket Events")
      .addTag("security", "Security & Threat Detection")
      .addTag("search", "Search & Autocomplete")
      .addTag("notifications", "Notifications & Alerts")
      .addTag("geocoding", "Geocoding & Location Services")
      .addTag("media", "Media & Upload Management")
      .addTag("reviews", "Reviews & Ratings")
      .addTag("chat", "Chat & Communication")
      .addTag("reporting", "Reporting & Analytics")
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    });

    // Export OpenAPI JSON
    if (process.env.EXPORT_OPENAPI === "true") {
      const openApiPath = join(process.cwd(), "openapi.json");
      fs.writeFileSync(openApiPath, JSON.stringify(document, null, 2));
      const logger = new (await import("@nestjs/common")).Logger("Bootstrap");
      logger.log(
        `📄 OpenAPI JSON exportiert nach: ${openApiPath}`,
        "Bootstrap",
      );
    }

    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha",
        docExpansion: "list",
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: "UberFoods API Documentation",
      customfavIcon: "/favicon.ico",
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
      `,
    });
  }

  // Upload-Verzeichnisse erstellen
  const uploadDirs = [
    join(process.cwd(), "uploads", "restaurants"),
    join(process.cwd(), "uploads", "dishes"),
    join(process.cwd(), "uploads", "reviews"),
  ];

  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Statische Dateien für Uploads
  app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Logger für Startup-Messages
  const logger = new (await import("@nestjs/common")).Logger("Bootstrap");
  logger.log(`🚀 Backend läuft auf http://localhost:${port}`, "Bootstrap");
  logger.log(`📁 Upload-Verzeichnisse erstellt`, "Bootstrap");
  logger.log(`🌐 CORS aktiviert für: ${corsOrigins.join(", ")}`, "Bootstrap");
  logger.log(`🔒 Security Headers aktiviert`, "Bootstrap");

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_SWAGGER === "true"
  ) {
    logger.log(
      `📚 API Dokumentation verfügbar unter http://localhost:${port}/api/docs`,
      "Bootstrap",
    );
  }

  logger.log(
    `🏥 Health Checks verfügbar unter http://localhost:${port}/api/health`,
    "Bootstrap",
  );
  logger.log(
    `🔮 Predictions verfügbar unter http://localhost:${port}/api/analytics/predictions`,
    "Bootstrap",
  );
  logger.log(
    `🗺️ Geocoding verfügbar unter http://localhost:${port}/api/geocoding/geocode`,
    "Bootstrap",
  );
}

bootstrap();
