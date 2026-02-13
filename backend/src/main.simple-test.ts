import { NestFactory } from "@nestjs/core";
import { AppModuleSimple } from "./app.module.simple";

async function bootstrap() {
  const app = await NestFactory.create(AppModuleSimple);

  // Globaler API Prefix - alle Routen werden mit /api prefixiert
  app.setGlobalPrefix("api");

  // CORS konfigurieren
  app.enableCors({
    origin: [
      "http://localhost:3001", // Admin Panel
      "http://localhost:3002", // Customer Web
      "http://localhost:3003", // Restaurant Web
      "http://localhost:3004", // Driver App
      "http://localhost:5173", // Vite default
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Simple Test Backend läuft auf http://localhost:${port}`);
  console.log(
    `🏥 Health Check verfügbar unter http://localhost:${port}/api/health`,
  );
}

bootstrap();
