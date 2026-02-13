import { Module } from "@nestjs/common";
import { AiMlSyncController } from "./ai-ml-sync.controller";

@Module({
  controllers: [AiMlSyncController],
})
export class AiMlSyncModule {}
