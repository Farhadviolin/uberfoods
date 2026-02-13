import { Module } from "@nestjs/common";
import { RestaurantController } from "./restaurant.controller";
import { RestaurantService } from "./restaurant.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { CacheModule } from "../../common/cache/cache.module";
import { MetricsModule } from "../../common/services/metrics.module";
import { EmailModule } from "../../common/services/email.module";

@Module({
  imports: [PrismaModule, CacheModule, MetricsModule, EmailModule],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
