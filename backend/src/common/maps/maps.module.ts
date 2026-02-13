import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../database/database.module";
import { MapsService } from "./maps.service";

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
