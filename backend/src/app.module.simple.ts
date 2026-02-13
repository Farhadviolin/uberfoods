import { Module } from "@nestjs/common";
import { SimpleHealthController } from "./controllers/simple-health.controller";

@Module({
  imports: [],
  controllers: [SimpleHealthController],
  providers: [],
})
export class AppModuleSimple {}
