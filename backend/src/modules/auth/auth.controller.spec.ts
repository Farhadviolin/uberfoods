import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SocialAuthService } from "./social-auth.service";
import { MfaService } from "./mfa.service";
import { ModuleRef } from "@nestjs/core";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

describe("AuthController", () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    adminLogin: jest.fn(),
    driverLogin: jest.fn(),
    restaurantLogin: jest.fn(),
    customerLogin: jest.fn(),
    customerRegister: jest.fn(),
    validateUser: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockSocialAuthService = {
    socialLogin: jest.fn(),
  };

  const mockMfaService = {
    generateQrCode: jest.fn(),
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SocialAuthService, useValue: mockSocialAuthService },
        { provide: MfaService, useValue: mockMfaService },
        { provide: ModuleRef, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("customerLogin", () => {
    it("sollte Kunden einloggen", async () => {
      const loginDto = {
        email: "test@example.com",
        password: process.env.TEST_PASSWORD || `test-pw-${Date.now()}`,
      };
      const mockUser = { id: "u1", email: loginDto.email };
      const mockResult = {
        user: mockUser,
        accessToken: process.env.TEST_ACCESS_TOKEN || `test-token-${Date.now()}`,
        refreshToken: process.env.TEST_REFRESH_TOKEN || `test-refresh-${Date.now()}`,
      };
      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(mockResult);

      const result = await controller.customerLogin(loginDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        "customer"
      );
    });
  });

  describe("customerRegister", () => {
    it("sollte neuen Kunden registrieren", async () => {
      const registerDto = {
        email: "test@example.com",
        password: process.env.TEST_PASSWORD || `test-password-${Date.now()}`,
        name: "Test User",
      };
      const mockResult = {
        user: { id: "u1", email: registerDto.email },
        accessToken: process.env.TEST_ACCESS_TOKEN || `test-token-${Date.now()}`,
      };
      mockAuthService.customerRegister.mockResolvedValue(mockResult);

      const result = await controller.customerRegister(registerDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.customerRegister).toHaveBeenCalledWith(registerDto);
    });
  });

  describe("refresh", () => {
    it("sollte Token aktualisieren", async () => {
      const mockResult = {
        accessToken: process.env.TEST_ACCESS_TOKEN || `test-token-${Date.now()}`,
        refreshToken: process.env.TEST_REFRESH_TOKEN || `test-refresh-${Date.now()}`,
      };
      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      const result = await controller.refresh({ refresh_token: "oldRefresh" });

      expect(result).toEqual(mockResult);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith("oldRefresh", undefined);
    });
  });
});
