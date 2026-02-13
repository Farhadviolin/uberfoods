import { NestFactory } from "@nestjs/core";
import { MinimalAppModule } from "./minimal-app.module";

async function bootstrap() {
  const app = await NestFactory.create(MinimalAppModule);

  // Globaler API Prefix
  app.setGlobalPrefix("api");

  // CORS für Admin Panel
  app.enableCors({
    origin: ["http://localhost:3001", "http://localhost:3002"],
    credentials: true,
  });

  await app.listen(3000);
  console.log("🚀 Minimal Backend läuft auf http://localhost:3000");
  console.log("📚 API Dokumentation: http://localhost:3000/api/docs");
}

bootstrap();
