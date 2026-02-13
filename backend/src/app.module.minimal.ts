import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

// Add AuthModule for authentication
import { AuthModule } from "./modules/auth/auth.module";
// Add DriverModule for driver endpoints
import { DriverModule } from "./modules/driver/driver.module.final";

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Core E2E Modules
    AuthModule,
    DriverModule,
  ],
  providers: [],
})
export class AppModuleMinimal {}
