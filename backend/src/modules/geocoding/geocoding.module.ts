import { Module } from "@nestjs/common";
import { MapsModule } from "../../common/maps/maps.module";
import { GeocodingController } from "./geocoding.controller";

@Module({
  imports: [MapsModule],
  controllers: [GeocodingController],
})
export class GeocodingModule {}
