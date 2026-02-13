import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ModulesContainer } from "@nestjs/core/injector";
import { AppModuleDriverTest } from "./app.module.driver-test";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import * as express from "express";
import * as compression from "compression";

async function bootstrap() {
  console.log("[BOOT] BUILD_ID=DRIVER-ROUTES-20251222-2250");
  const app = await NestFactory.create(AppModuleDriverTest);

  // Globaler API Prefix - alle Routen werden mit /api prefixiert
  app.setGlobalPrefix("api");

  // CORS konfigurieren
  app.enableCors({
    origin: [
      "http://localhost:3001", // Admin Panel
      "http://localhost:3002", // Customer Web
      "http://localhost:3003", // Restaurant Web
      "http://localhost:3004", // Driver App
      "http://localhost:5173", // Vite Default Port
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  });

  // Performance: Response Compression
  app.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Logger für Startup-Messages
  const logger = console;
  logger.log(
    `🚀 Driver Test Backend läuft auf http://localhost:${port}`,
    "Bootstrap",
  );
  logger.log(`📁 Driver routes available under /api/drivers`, "Bootstrap");
}

bootstrap();
