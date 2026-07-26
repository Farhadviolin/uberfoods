import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { RbacService } from "./rbac.service";

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
