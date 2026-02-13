import { Module, Global } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { CacheStrategyService } from "./cache-strategy.service";

@Global()
@Module({
  providers: [CacheService, CacheStrategyService],
  exports: [CacheService, CacheStrategyService],
})
export class CacheModule {}
