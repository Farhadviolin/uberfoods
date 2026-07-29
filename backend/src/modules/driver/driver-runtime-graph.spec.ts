import { MODULE_METADATA } from "@nestjs/common/constants";
import { ConfigModule } from "@nestjs/config";
import { ModulesContainer } from "@nestjs/core";
import { PassportModule } from "@nestjs/passport";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../app.module";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { DriverEndpointsController } from "../order/driver-endpoints.controller";
import { OrderModule } from "../order/order.module";
import { OrderService } from "../order/order.service";
import { DriverModule } from "./driver.module";

describe("Driver order runtime module graph", () => {
  const prisma = {
    driver: { findUnique: jest.fn() },
    customer: { findUnique: jest.fn() },
    order: { findMany: jest.fn() },
  };
  const orderService = {
    acceptByDriver: jest.fn(),
    updateStatusForActor: jest.fn(),
  };

  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: "driver-runtime-graph-test-secret",
              NODE_ENV: "test",
              ALLOW_DEV_AUTH: "false",
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: "jwt" }),
        DriverModule,
      ],
      providers: [JwtStrategy],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(OrderService)
      .useValue(orderService)
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it("binds the controller once through AppModule -> DriverModule -> OrderModule", async () => {
    const appImports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? [];
    const driverImports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, DriverModule) ?? [];
    const orderImports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, OrderModule) ?? [];
    const driverControllers =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, DriverModule) ?? [];
    const orderControllers =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, OrderModule) ?? [];

    expect(appImports.filter((entry: unknown) => entry === DriverModule)).toHaveLength(1);
    expect(driverImports.filter((entry: unknown) => entry === OrderModule)).toHaveLength(1);
    expect(orderImports).not.toContain(DriverModule);
    expect(driverControllers.filter((entry: unknown) => entry === DriverEndpointsController)).toHaveLength(1);
    expect(orderControllers).not.toContain(DriverEndpointsController);

    const modules = module.get(ModulesContainer);
    const controllerModules = Array.from(modules.values()).filter((nestModule) =>
      nestModule.controllers.has(DriverEndpointsController),
    );

    expect(controllerModules).toHaveLength(1);
    expect(controllerModules[0].metatype).toBe(DriverModule);
    expect(module.get(OrderService)).toBe(orderService);

    const app = module.createNestApplication();
    await app.init();
    await app.close();
  });
});
