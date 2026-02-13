import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();

    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      this.logger.log(
        "✅ Prisma Client initialisiert (DATABASE_URL verfügbar)",
      );
    } else {
      this.logger.warn(
        "⚠️ DATABASE_URL nicht gefunden - Prisma verwendet .env oder Standard-URL",
      );
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("✅ Prisma Client erfolgreich verbunden");
    } catch (error) {
      this.logger.error(
        `❌ Prisma Client Verbindungsfehler: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      // CRASH in E2E mode - database must be available for tests
      if (
        process.env.NODE_ENV === "e2e" ||
        process.argv.includes("main.e2e.ts")
      ) {
        this.logger.error(
          "🚨 E2E MODE: Crashing because database connection failed!",
        );
        process.exit(1);
      }
      throw error; // Also crash in production
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("🔌 Prisma Client Verbindung geschlossen");
  }
}
