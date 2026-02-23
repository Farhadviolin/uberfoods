import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module.full";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import * as helmet from "helmet";
import * as express from "express";
import * as compression from "compression";
import { join } from "path";
import * as fs from "fs";
import * as Sentry from "@sentry/node";
import { validateStripeConfig } from "./config/stripe.validation";

function validateEnv() {
  const requiredAlways = ["JWT_SECRET", "DATABASE_URL"];
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
    console.error(
      `Missing critical environment variables: ${missingAlways.join(", ")}`,
    );
    process.exit(1);
  }

  const missingProdOnly = requiredProdOnly.filter((key) => !process.env[key]);
  if (missingProdOnly.length > 0 && process.env.NODE_ENV === "production") {
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

  if (process.env.NODE_ENV !== "production") {
    if (missingProdOnly.includes("ALLOWED_ORIGINS")) {
      console.warn(
        `ALLOWED_ORIGINS not set - using localhost defaults for development`,
      );
    }
  }

  const missingRecommended = recommended.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn(
      `Recommended environment variables not set: ${missingRecommended.join(", ")}`,
    );
  }
}

async function bootstrap() {
  console.log(
    `[BOOT] Full stack starting, NODE_ENV="${process.env.NODE_ENV}"`,
  );
  validateEnv();

  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      release: process.env.APP_VERSION || "1.0.0",
      beforeSend(event, hint) {
        if (process.env.NODE_ENV !== "production") {
          const error = hint.originalException;
          if (error && typeof error === "object" && "message" in error) {
            const errorMessage = error.message;
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
  console.log("[BOOT] Full stack (MVP) mode");
  const configService = app.get(ConfigService);

  const { RedisSocketAdapter } =
    await import("./common/adapters/redis-socket.adapter");
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_SOCKET_URL;
  app.useWebSocketAdapter(new RedisSocketAdapter(app, redisUrl));

  app.setGlobalPrefix("api");

  const allowedOrigins = configService.get<string>("ALLOWED_ORIGINS");
  const corsOrigins = allowedOrigins
    ? allowedOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error(
            "ALLOWED_ORIGINS environment variable is required in production.",
          );
        })()
      : [
          "http://localhost:3102",
          "http://localhost:3002",
          "http://localhost:3003",
          "http://localhost:3004",
          "http://localhost:5173",
        ];

  app.enableCors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }
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

  app.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  const { LoggingInterceptor } =
    await import("./common/interceptors/logging.interceptor");
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
  app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

  const { RequestIdMiddleware } =
    await import("./common/middleware/request-id.middleware");
  app.use(new RequestIdMiddleware().use);

  const { SecurityMiddleware } =
    await import("./common/middleware/security.middleware");
  const securityMiddleware = new SecurityMiddleware();
  app.use((req: any, res: any, next: any) =>
    securityMiddleware.use(req, res, next),
  );

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_SWAGGER === "true"
  ) {
    const config = new DocumentBuilder()
      .setTitle("UberFoods API")
      .setDescription("Food Delivery Platform API - Full MVP")
      .setVersion("1.0")
      .addServer("http://localhost:3000", "Development")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          in: "header",
        },
        "JWT-auth",
      )
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    });

    if (process.env.EXPORT_OPENAPI === "true") {
      const openApiPath = join(process.cwd(), "openapi.json");
      fs.writeFileSync(openApiPath, JSON.stringify(document, null, 2));
    }

    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const uploadDirs = [
    join(process.cwd(), "uploads", "restaurants"),
    join(process.cwd(), "uploads", "dishes"),
    join(process.cwd(), "uploads", "reviews"),
  ];
  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

  const globalPrefix = "api";
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, "0.0.0.0");

  const logger = new (await import("@nestjs/common")).Logger("Bootstrap");
  logger.log(
    `🚀 Listening on http://0.0.0.0:${port}${globalPrefix ? "/" + globalPrefix : ""}`,
    "Bootstrap",
  );
  logger.log(`🏥 Health: http://0.0.0.0:${port}/api/health`, "Bootstrap");
}

bootstrap();
