import { NestFactory } from "@nestjs/core";
import { AppModuleMinimal } from "./app.module.minimal";

async function bootstrap() {
  console.log("[BOOT] Starting Minimal Backend...");

  const app = await NestFactory.create(AppModuleMinimal);

  // Enable CORS for frontend development
  app.enableCors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
    ],
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix("api");

  // Health check endpoint
  app.getHttpAdapter().get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`[BOOT] Minimal Backend listening on port ${port}`);
  console.log(`[BOOT] API docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
