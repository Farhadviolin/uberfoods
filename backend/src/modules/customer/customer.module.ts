import { Module } from "@nestjs/common";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@Module({
  imports: [PrismaModule],
  controllers: [CustomerController],
  providers: [CustomerService, JwtAuthGuard, RolesGuard],
  exports: [CustomerService],
})
export class CustomerModule {}
