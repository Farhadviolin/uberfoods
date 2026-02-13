import { Module } from "@nestjs/common";
import { MLAssignmentController } from "./ml-assignment.controller";
import { MLAssignmentService } from "./ml-assignment.service";
import { DatabaseModule } from "../../common/database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [MLAssignmentController],
  providers: [MLAssignmentService],
  exports: [MLAssignmentService],
})
export class MLAssignmentModule {}
