import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModuleMinimal } from "./app.module.minimal";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import * as express from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModuleMinimal);

  // Globaler API Prefix - alle Routen werden mit /api prefixiert
  app.setGlobalPrefix("api");

  // CORS konfigurieren
  app.enableCors({
    origin: [
      "http://localhost:3002", // Admin Panel
      "http://localhost:3001", // Customer Web
      "http://localhost:3003", // Restaurant Web
      "http://localhost:3004", // Driver App
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  });

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

  // Mock Health Endpoint
  app.use("/api/health", (req: any, res: any) => {
    res.json({ status: "ok", message: "Mock Health Check" });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Logger für Startup-Messages
  const logger = console;
  logger.log(`🚀 Mock Backend läuft auf http://localhost:${port}`);
  logger.log(
    `🏥 Health Checks verfügbar unter http://localhost:${port}/api/health`,
  );
  logger.log(`🔐 Auth verfügbar unter http://localhost:${port}/api/auth/login`);
}

bootstrap();
