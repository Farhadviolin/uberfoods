import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { DishController } from "./dish.controller";
import { DishService } from "./dish.service";

@Module({
  imports: [DatabaseModule],
  controllers: [DishController],
  providers: [DishService],
  exports: [DishService],
})
export class DishModule {}
