import { Module } from "@nestjs/common";
import { E2EController } from "./e2e.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [E2EController],
  providers: [],
  exports: [],
})
export class E2EModule {}
