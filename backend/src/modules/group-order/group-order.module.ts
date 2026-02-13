import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { GroupOrderController } from "./group-order.controller";
import { GroupOrderService } from "./group-order.service";

@Module({
  imports: [DatabaseModule],
  controllers: [GroupOrderController],
  providers: [GroupOrderService],
})
export class GroupOrderModule {}
