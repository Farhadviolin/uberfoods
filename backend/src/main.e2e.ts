import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModuleE2E } from "./app.module.e2e";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Fatal error handlers - CRASH on errors to fail E2E tests properly
process.on("unhandledRejection", (error) => {
  console.error("[E2E] 🚨 FATAL: unhandledRejection:", error);
  console.error("[E2E] Crashing to fail E2E test - fix the underlying issue!");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("[E2E] 🚨 FATAL: uncaughtException:", error);
  console.error("[E2E] Crashing to fail E2E test - fix the underlying issue!");
  process.exit(1);
});

// E2E Restart detection and process event logging
console.log("[E2E_BOOT]", new Date().toISOString(), "PID", process.pid);

process.on("SIGTERM", (signal) => {
  console.log(
    "[E2E_SIGNAL]",
    new Date().toISOString(),
    "SIGTERM received, PID",
    process.pid,
  );
});

process.on("SIGINT", (signal) => {
  console.log(
    "[E2E_SIGNAL]",
    new Date().toISOString(),
    "SIGINT received, PID",
    process.pid,
  );
});

// Remove duplicate handlers - we use the fatal ones above

// Load E2E environment variables robustly with fallback paths
function loadE2EEnv() {
  const candidates = [
    resolve(process.cwd(), ".env.e2e"), // Current working directory
    resolve(process.cwd(), "..", ".env.e2e"), // Parent directory (repo root)
    resolve(process.cwd(), "..", "backend", ".env.e2e"), // Explicit backend path
  ];

  let loaded = false;
  let loadedPath = "";

  for (const candidate of candidates) {
    try {
      const result = dotenv.config({ path: candidate, override: true });
      if (!result.error) {
        loaded = true;
        loadedPath = candidate;
        console.log(`[E2E] ✅ Loaded .env.e2e from: ${candidate}`);
        break;
      }
    } catch (error) {
      // Continue to next candidate
    }
  }

  if (!loaded) {
    console.warn(
      "[E2E] ⚠️  No .env.e2e file found in any candidate path. E2E may fail due to missing environment variables.",
    );
    console.warn("[E2E] 📍 Searched paths:");
    candidates.forEach((path) => console.warn(`     - ${path}`));
  }

  // Always log DATABASE_URL status (critical for E2E)
  if (process.env.DATABASE_URL) {
    console.log("[E2E] ✅ DATABASE_URL loaded");
  } else {
    console.error(
      "[E2E] ❌ DATABASE_URL NOT FOUND - Backend will fail to start",
    );
    process.exit(1);
  }

  // Ensure DEFAULT_DRIVER_PASSWORD is set for E2E
  if (!process.env.DEFAULT_DRIVER_PASSWORD) {
    process.env.DEFAULT_DRIVER_PASSWORD = "driver123";
    console.log("[E2E] ✅ Set DEFAULT_DRIVER_PASSWORD for E2E testing");
  }
}

loadE2EEnv();

async function bootstrap() {
  console.log("[BOOT] Starting E2E Backend...");

  console.log("[BOOT] 📦 Creating NestJS application...");
  const app = await NestFactory.create(AppModuleE2E);
  console.log("[BOOT] ✅ NestJS application created");

  console.log("[BOOT] 🔧 Configuring CORS...");
  // Enable CORS for frontend development

  // Enable CORS for frontend development
  app.enableCors({
    origin: [
      "http://localhost:3102", // customer-web
      "http://localhost:3002", // admin-panel
      "http://localhost:3003", // restaurant-web
      "http://localhost:3004", // driver-app
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix("api");

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("UberFoods API")
    .setDescription("Food delivery platform API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Health check endpoint
  console.log("[BOOT] 🏥 Setting up health check endpoint...");
  app.getHttpAdapter().get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Add request logging middleware for E2E debugging
  app.use((req, res, next) => {
    if (req.url?.includes("/api/auth/") || req.url?.includes("/api/health")) {
      console.log(
        `[E2E BACKEND] ${req.method} ${req.url} - E2E Backend handling request`,
      );
    }
    next();
  });

  console.log(`[BOOT] DEBUG: process.env.PORT = "${process.env.PORT}"`);
  const port = Number(process.env.PORT ?? 3001);
  console.log(`[BOOT] 🚀 Starting HTTP server on port ${port}...`);
  await app.listen(port, "0.0.0.0");
  console.log(`[BOOT] ✅ E2E Backend listening on http://localhost:${port}`);
  console.log(
    `[BOOT] 📖 API docs available at http://localhost:${port}/api/docs`,
  );
}

bootstrap();
