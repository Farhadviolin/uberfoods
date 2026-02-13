import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import { RestaurantModule } from "./modules/restaurant/restaurant.module";
import { DishModule } from "./modules/dish/dish.module";
import { OrderModule } from "./modules/order/order.module";
import { CustomerModule } from "./modules/customer/customer.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    RestaurantModule,
    DishModule,
    OrderModule,
    CustomerModule,
  ],
})
export class MinimalAppModule {}
