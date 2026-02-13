import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DriverModule } from "./modules/driver/driver.module.final";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    DriverModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModuleDriverTest {}
