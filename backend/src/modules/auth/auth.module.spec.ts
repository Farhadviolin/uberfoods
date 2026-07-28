import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { PrismaService } from "../../prisma/prisma.service";
import { DriverAuditService } from "../../common/services/driver-audit.service";

describe("AuthModule DriverAuditService contract", () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = "auth-module-test-access-secret";
  });

  afterAll(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it("compiles the real AuthModule with a defined DriverAuditService", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(AuthService)).toBeDefined();
    expect(moduleRef.get(DriverAuditService)).toBeDefined();
    await moduleRef.close();
  });

  it("fails during compile when the mandatory DriverAuditService is missing", async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: {} },
          { provide: JwtService, useValue: {} },
          { provide: MfaService, useValue: {} },
        ],
      }).compile(),
    ).rejects.toThrow(/DriverAuditService/);
  });
});
