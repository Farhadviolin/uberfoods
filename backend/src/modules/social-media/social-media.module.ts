import { Module } from "@nestjs/common";
import { SocialMediaService } from "./social-media.service";
import { SocialMediaController } from "./social-media.controller";
import { SocialDiscoveryController } from "./social-discovery.controller";
import { SocialDiscoveryService } from "./social-discovery.service";

@Module({
  providers: [SocialMediaService, SocialDiscoveryService],
  controllers: [SocialMediaController, SocialDiscoveryController],
  exports: [SocialMediaService, SocialDiscoveryService],
})
export class SocialMediaModule {}
