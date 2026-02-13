import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { MealPlannerController } from "./meal-planner.controller";
import { MealPlannerService } from "./meal-planner.service";

@Module({
  imports: [DatabaseModule],
  controllers: [MealPlannerController],
  providers: [MealPlannerService],
})
export class MealPlannerModule {}
