import { Module } from "@nestjs/common";
import { RbacService } from "./rbac.service";

@Module({
  imports: [],
  controllers: [],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
