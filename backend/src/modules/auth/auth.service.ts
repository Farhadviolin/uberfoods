import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
  Inject,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { MfaService } from "./mfa.service";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { DriverAuditService } from "../../common/services/driver-audit.service";

export interface UserData {
  id: string;
  email: string;
  role?: string;
  userType?: string;
  [key: string]: unknown;
}

export interface LoginResult {
  access_token: string;
  user: UserData;
  refresh_token?: string;
}

interface DeviceInfo {
  deviceId?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  [key: string]: unknown;
}

interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  [key: string]: unknown;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mfaService: MfaService,
    @Optional()
    @Inject(DriverAuditService)
    private driverAuditService?: DriverAuditService,
  ) {}

  /**
   * Normalisiert Email-Adresse zu lowercase und trimmed Whitespace
   * Für case-insensitive Email-Vergleiche
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  async validateUser(email: string, password: string, role?: string) {
    try {
      console.log(
        `[E2E-AUTH-DEBUG] validateUser called with email="${email}", role="${role || "auto"}", NODE_ENV="${process.env.NODE_ENV}", E2E_AUTH_DEBUG="${process.env.E2E_AUTH_DEBUG}"`,
      );
      const normalizedEmail = this.normalizeEmail(email);

      // E2E Debug Logging
      const isE2E =
        process.env.NODE_ENV === "e2e" || process.env.E2E_AUTH_DEBUG === "true";
      if (isE2E) {
        console.log(
          `[E2E-AUTH] validateUser called: email="${email}", normalized="${normalizedEmail}", role="${role || "auto"}"`,
        );
      }

      let user;
      let userType: string;

      if (role === "admin") {
        user = await this.prisma.admin.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            password: true,
            isActive: true,
          },
        });
        userType = "admin";
      } else if (role === "restaurant") {
        user = await this.prisma.restaurant.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            password: true,
            isActive: true,
          },
        });
        userType = "restaurant";
      } else if (role === "driver") {
        user = await this.prisma.driver.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            password: true,
            isActive: true,
          },
        });
        userType = "driver";
      } else {
        // Auto-detect user type by trying all tables
        user = await this.prisma.customer.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            password: true,
            isActive: true,
          },
        });
        userType = "customer";

        if (isE2E) {
          this.logger.log(
            `[E2E-AUTH] Auto-detect: Customer lookup result: ${user ? "FOUND" : "NOT FOUND"}`,
          );
        }

        if (!user) {
          user = await this.prisma.admin.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              email: true,
              password: true,
              isActive: true,
            },
          });
          userType = "admin";

          if (isE2E) {
            this.logger.log(
              `[E2E-AUTH] Auto-detect: Admin lookup result: ${user ? "FOUND" : "NOT FOUND"}`,
            );
          }
        }

        if (!user) {
          user = await this.prisma.restaurant.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              email: true,
              password: true,
              isActive: true,
            },
          });
          userType = "restaurant";
        }

        if (!user) {
          user = await this.prisma.driver.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              email: true,
              password: true,
              isActive: true,
            },
          });
          userType = "driver";
          if (user) {
            this.logger.log(`Found driver user: ${normalizedEmail}`);
          }
        }
      }

      if (isE2E) {
        this.logger.log(
          `[E2E-AUTH] Final user lookup: type="${userType}", found=${!!user}`,
        );
        if (user) {
          this.logger.log(
            `[E2E-AUTH] User details: id=${user.id}, isActive=${user.isActive}, hasPassword=${!!user.password}`,
          );
        }
      }

      if (!user) {
        if (isE2E) {
          this.logger.log(
            `[E2E-AUTH] RESULT: No user found - throwing "Invalid credentials"`,
          );
        }
        throw new UnauthorizedException("Invalid credentials");
      }

      // Check if user is active
      if (isE2E) {
        this.logger.log(
          `[E2E-AUTH] isActive check: user.isActive = ${user.isActive}`,
        );
      }
      if (user.isActive === false) {
        if (isE2E) {
          this.logger.log(
            `[E2E-AUTH] RESULT: isActive=false - throwing "Account is deactivated"`,
          );
        }
        throw new UnauthorizedException("Account is deactivated");
      }
      if (isE2E) {
        this.logger.log(`[E2E-AUTH] isActive check PASSED`);
      }

      // Check if password exists (social auth users might not have passwords)
      if (isE2E) {
        this.logger.log(
          `[E2E-AUTH] Password field check: user.password exists = ${!!user.password}`,
        );
      }
      if (!user.password) {
        if (isE2E) {
          this.logger.log(
            `[E2E-AUTH] RESULT: No password field - throwing "Password authentication not available"`,
          );
        }
        throw new UnauthorizedException(
          "Password authentication not available for this account",
        );
      }
      if (isE2E) {
        this.logger.log(`[E2E-AUTH] Password field check PASSED`);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isE2E) {
        this.logger.log(
          `[E2E-AUTH] Password validation: bcrypt.compare("${password.substring(0, 3)}...", user.password) = ${isPasswordValid}`,
        );
      }

      if (!isPasswordValid) {
        if (isE2E) {
          this.logger.log(
            `[E2E-AUTH] RESULT: Password validation FAILED - throwing "Invalid credentials"`,
          );
        }
        // Debug logging for driver login
        if (userType === "driver") {
          this.logger.warn(
            `Driver login failed for ${user.email}: invalid password, hash exists=${!!user.password}`,
          );
        }
        // Log failed attempt
        await this.logFailedLoginAttempt(user.id, userType, "INVALID_PASSWORD");
        throw new UnauthorizedException("Invalid credentials");
      }

      if (isE2E) {
        this.logger.log(`[E2E-AUTH] Password validation SUCCESS`);
      }

      // Log successful login
      await this.logSuccessfulLogin(user.id, userType);

      // Audit Driver login
      if (userType === "driver" && this.driverAuditService) {
        await this.driverAuditService.log({
          driverId: user.id,
          action: "LOGIN",
        });
      }

      const { password: _, ...result } = user;
      return { ...result, userType };
    } catch (error) {
      const isE2E =
        process.env.NODE_ENV === "e2e" || process.env.E2E_AUTH_DEBUG === "true";
      if (isE2E) {
        this.logger.error(
          `[E2E-AUTH] validateUser CRASHED: ${error.message}`,
          error.stack,
        );
      }
      throw error;
    }
  }

  async validateUserWithMFA(
    email: string,
    password: string,
    mfaToken?: string,
    role?: string,
  ) {
    const isE2E =
      process.env.NODE_ENV === "e2e" || process.env.E2E_AUTH_DEBUG === "true";
    if (isE2E) {
      this.logger.log(
        `[E2E-AUTH] validateUserWithMFA called: email="${email}", role="${role || "auto"}"`,
      );
    }

    const userData = await this.validateUser(email, password, role);

    if (isE2E) {
      this.logger.log(
        `[E2E-AUTH] validateUser returned: userData=${!!userData}, userType=${userData?.userType}, id=${userData?.id}`,
      );
    }

    // Check if MFA is required for this user
    const mfaRequired = await this.isMfaRequired(
      userData.id,
      userData.userType,
    );

    if (mfaRequired) {
      if (!mfaToken) {
        return { requiresMfa: true, user: userData };
      }

      // Verify MFA token
      const isMfaValid = await this.mfaService.verifyMfaToken(
        userData.id,
        mfaToken,
      );
      if (!isMfaValid) {
        await this.logFailedLoginAttempt(
          userData.id,
          userData.userType,
          "INVALID_MFA",
        );
        throw new UnauthorizedException("Invalid MFA token");
      }
    }

    return { requiresMfa: false, user: userData };
  }

  async login(
    user: UserData,
    includeRefreshToken: boolean = false,
  ): Promise<LoginResult> {
    const userType =
      typeof user.userType === "string" ? user.userType.toLowerCase() : undefined;
    const role = user.role || userType || "customer";
    const payload = {
      email: user.email,
      sub: user.id,
      role,
      type: user.userType ?? role.toUpperCase(),
      isActive: user.isActive,
      currentStatus: user.currentStatus,
    };

    const result: LoginResult = {
      access_token: this.jwtService.sign(payload),
      user,
    };

    // Generate refresh token if requested
    if (includeRefreshToken) {
      result.refresh_token = await this.generateRefreshToken(user.id, role);
    }

    return result;
  }

  async driverLogin(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    this.logger.log(`Driver login attempt for: ${normalizedEmail}`);
    const driver = await this.prisma.driver.findUnique({
      where: { email: normalizedEmail },
    });
    if (!driver) {
      this.logger.warn(`Driver not found: ${normalizedEmail}`);
      throw new UnauthorizedException("Invalid credentials");
    }
    this.logger.log(
      `Driver found: ${driver.id}, has password: ${!!driver.password}`,
    );

    if (!driver.password) {
      throw new UnauthorizedException(
        "Password authentication not available for this account",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) {
      await this.logFailedLoginAttempt(driver.id, "driver", "INVALID_PASSWORD");
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.logSuccessfulLogin(driver.id, "driver");

    const { password: _, ...result } = driver;
    // Include refresh token for driver login
    return this.login({ ...result, role: "driver" }, true);
  }

  async restaurantLogin(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { email: normalizedEmail },
    });
    if (!restaurant) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!restaurant.password) {
      throw new UnauthorizedException(
        "Password authentication not available for this account",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, restaurant.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const { password: _, ...result } = restaurant;
    return this.login({
      ...result,
      role: "restaurant",
      currentStatus: "ACTIVE",
    });
  }

  async adminLogin(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });
    if (!admin) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const { password: _, ...result } = admin;
    // Rolle und userType für Admin explizit setzen
    return this.login({
      ...result,
      role: admin.role,
      userType: "ADMIN",
    });
  }

  async customerRegister(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
  }) {
    // Normalisiere Email für case-insensitive Suche und Speicherung
    const normalizedEmail = this.normalizeEmail(data.email);

    // Check if customer already exists
    const existing = await this.prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new UnauthorizedException(
        "Customer with this email already exists",
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const customer = await this.prisma.customer.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        address: data.address,
      },
    });

    const { password, ...userWithoutPassword } = customer;
    return this.login({ ...userWithoutPassword, role: "customer" }, true);
  }

  // Enhanced Authentication Methods
  async loginWithMFA(
    email: string,
    password: string,
    mfaToken?: string,
    deviceInfo?: DeviceInfo,
    role?: string,
  ) {
    const validation = await this.validateUserWithMFA(
      email,
      password,
      mfaToken,
      role,
    );

    if (validation.requiresMfa) {
      return {
        requiresMfa: true,
        sessionId: null,
        access_token: null,
        refresh_token: null,
      };
    }

    const isE2E =
      process.env.NODE_ENV === "e2e" || process.env.E2E_AUTH_DEBUG === "true";
    if (isE2E) {
      this.logger.log(
        `[E2E-AUTH] loginWithMFA: creating session for user ${validation.user.id} (${validation.user.userType})`,
      );
    }

    const session = await this.createSession(
      validation.user.id,
      validation.user.userType,
      deviceInfo,
    );

    if (isE2E) {
      this.logger.log(
        `[E2E-AUTH] loginWithMFA: session created, calling this.login()`,
      );
    }

    // Include refresh token for MFA login
    const tokens = await this.login(validation.user, true);

    if (isE2E) {
      this.logger.log(
        `[E2E-AUTH] loginWithMFA: login successful, returning tokens`,
      );
    }

    return {
      requiresMfa: false,
      sessionId: session.id,
      ...tokens,
    };
  }

  async registerDriver(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    vehicleInfo?: VehicleInfo;
  }) {
    const normalizedEmail = this.normalizeEmail(data.email);

    // Check if driver already exists
    const existingDriver = await this.prisma.driver.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingDriver) {
      throw new ConflictException("Driver with this email already exists");
    }

    // Validate password strength
    this.validatePasswordStrength(data.password);

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create driver
    const driver = await this.prisma.driver.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        vehicleInfo: JSON.stringify(data.vehicleInfo || {}) as any,
        mustChangePassword: false,
        isActive: true,
        currentStatus: "OFFLINE",
        welcomeEmailSent: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Create default subscription (trial)
    await this.prisma.driverSubscription.create({
      data: {
        driver: { connect: { id: driver.id } },
        tier: "BASIC",
        status: "TRIALING",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return driver;
  }

  async changePassword(
    userId: string,
    userType: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.getUserById(userId, userType);

    if (!user.password) {
      throw new BadRequestException(
        "Password authentication not available for this account",
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.updateUserPassword(userId, userType, hashedPassword);

    // Invalidate all sessions except current
    await this.invalidateUserSessions(userId, userType);

    return { message: "Password changed successfully" };
  }

  async requestPasswordReset(email: string, userType?: string) {
    const normalizedEmail = this.normalizeEmail(email);
    let user;
    let detectedUserType = userType;

    if (userType === "driver") {
      user = await this.prisma.driver.findUnique({
        where: { email: normalizedEmail },
      });
    } else if (userType === "restaurant") {
      user = await this.prisma.restaurant.findUnique({
        where: { email: normalizedEmail },
      });
    } else if (userType === "admin") {
      user = await this.prisma.admin.findUnique({
        where: { email: normalizedEmail },
      });
    } else {
      // Try to find user in all tables
      user = await this.prisma.customer.findUnique({
        where: { email: normalizedEmail },
      });
      if (!user) {
        user = await this.prisma.driver.findUnique({
          where: { email: normalizedEmail },
        });
        detectedUserType = "driver";
      }
      if (!user) {
        user = await this.prisma.restaurant.findUnique({
          where: { email: normalizedEmail },
        });
        detectedUserType = "restaurant";
      }
    }

    if (!user) {
      // Don't reveal if email exists for security
      return { message: "If the email exists, a reset link has been sent" };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = await bcrypt.hash(resetToken, 12);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token
    await this.storePasswordResetToken(
      user.id,
      detectedUserType || "customer",
      resetTokenHash,
      expiresAt,
    );

    // Send reset email (would integrate with email service)
    this.logger.log(`Password reset token generated for ${email}`);

    return { message: "If the email exists, a reset link has been sent" };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find user by reset token
    const user = await this.findUserByResetToken(token);

    if (
      !user ||
      (user as { resetTokenExpiresAt?: Date }).resetTokenExpiresAt ===
        undefined ||
      (user as { resetTokenExpiresAt: Date }).resetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Validate new password
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await this.updateUserPassword(user.id, user.userType, hashedPassword);
    await this.clearPasswordResetToken(user.id, user.userType);

    // Invalidate all sessions
    await this.invalidateUserSessions(user.id, user.userType);

    return { message: "Password reset successfully" };
  }

  // Session Management
  async refreshToken(refreshToken: string, sessionId?: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });

      // Validate session if provided
      if (sessionId) {
        const session = await this.prisma.session.findUnique({
          where: { id: sessionId },
        });

        if (!session || session.expiresAt < new Date()) {
          throw new UnauthorizedException("Invalid session");
        }
      }

      // Generate new tokens
      const user = await this.getUserById(payload.sub, payload.userType);
      const newPayload = {
        email: user.email,
        sub: user.id,
        role: payload.userType,
        userType: payload.userType,
      };

      const tokens = {
        access_token: this.jwtService.sign(newPayload),
        refresh_token: refreshToken, // Keep same refresh token
      };

      if (payload.userType === "driver") {
        await this.driverAuditService.log({
          driverId: payload.sub,
          action: "LOGIN",
          metadata: { refresh: true, sessionId },
        });
      }

      return tokens;
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(sessionId: string) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (session?.userType === "driver") {
        await this.driverAuditService.log({
          driverId: session.userId,
          action: "LOGOUT",
          metadata: { sessionId },
        });
      }
    } catch (e) {
      this.logger.warn("Audit logout failed (session fetch)", e as Error);
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() },
    });
  }

  async logoutAll(userId: string, userType: string) {
    await this.invalidateUserSessions(userId, userType);

    if (userType === "driver") {
      await this.driverAuditService.log({
        driverId: userId,
        action: "LOGOUT",
        metadata: { allSessions: true },
      });
    }
  }

  async getActiveSessions(userId: string, userType: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        userType,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
        metadata: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Helper methods
  private async createSession(
    userId: string,
    userType: string,
    deviceInfo?: DeviceInfo,
  ) {
    const isE2E =
      process.env.NODE_ENV === "e2e" || process.env.E2E_AUTH_DEBUG === "true";
    if (isE2E) {
      this.logger.log(
        `[E2E-AUTH] createSession: creating session for userId=${userId}, userType=${userType}`,
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await this.prisma.session.create({
      data: {
        userId,
        userType,
        ipAddress: deviceInfo?.ip as string,
        userAgent: deviceInfo?.userAgent as string,
        expiresAt,
        metadata: deviceInfo as any,
      },
    });

    if (isE2E) {
      this.logger.log(
        `[E2E-AUTH] createSession: session created with id=${session.id}`,
      );
    }

    return session;
  }

  private async generateRefreshToken(
    userId: string,
    userType: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      userType,
      type: "refresh",
    };

    return this.jwtService.sign(payload, {
      secret: this.getRefreshTokenSecret(),
      expiresIn: "7d",
    });
  }

  private getRefreshTokenSecret(): string {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (refreshSecret) {
      return refreshSecret;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_REFRESH_SECRET environment variable is required in production",
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        "JWT_SECRET environment variable is required when JWT_REFRESH_SECRET is not set",
      );
    }

    return jwtSecret;
  }

  private async getUserById(id: string, userType: string) {
    switch (userType) {
      case "admin":
        return this.prisma.admin.findUnique({ where: { id } });
      case "restaurant":
        return this.prisma.restaurant.findUnique({ where: { id } });
      case "driver":
        return this.prisma.driver.findUnique({ where: { id } });
      default:
        return this.prisma.customer.findUnique({ where: { id } });
    }
  }

  private async updateLastLogin(userId: string, userType: string) {
    const updateData = { lastLoginAt: new Date() };

    switch (userType) {
      case "admin":
        await this.prisma.admin.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case "restaurant":
        await this.prisma.restaurant.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case "driver":
        // Driver has no lastLoginAt field - store in location JSON or skip
        await this.prisma.driver.update({ where: { id: userId }, data: {} });
        break;
      default:
        await this.prisma.customer.update({
          where: { id: userId },
          data: updateData,
        });
    }
  }

  async isMfaRequired(userId: string, userType: string): Promise<boolean> {
    const mfaRecord = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    return mfaRecord?.enabled || false;
  }

  private async logFailedLoginAttempt(
    userId: string,
    userType: string,
    reason: string,
  ) {
    // Log to audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "LOGIN_FAILED",
        entity: userType,
        entityId: userId,
        changes: { reason },
      },
    });
  }

  private async logSuccessfulLogin(userId: string, userType: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "LOGIN_SUCCESS",
        entity: userType,
        entityId: userId,
      },
    });
  }

  private validatePasswordStrength(password: string) {
    if (password.length < 8) {
      throw new BadRequestException(
        "Password must be at least 8 characters long",
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new BadRequestException(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      );
    }
  }

  private async updateUserPassword(
    userId: string,
    userType: string,
    hashedPassword: string,
  ) {
    switch (userType) {
      case "admin":
        await this.prisma.admin.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
        break;
      case "restaurant":
        await this.prisma.restaurant.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
        break;
      case "driver":
        await this.prisma.driver.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
        break;
      default:
        await this.prisma.customer.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
    }
  }

  private async storePasswordResetToken(
    userId: string,
    userType: string,
    token: string,
    expiresAt?: Date,
  ) {
    switch (userType) {
      case "admin":
        await this.prisma.admin.update({
          where: { id: userId },
          data: {
            passwordResetToken: token,
            passwordResetTokenExpires: expiresAt,
          },
        });
        break;
      case "restaurant":
        await this.prisma.restaurant.update({
          where: { id: userId },
          data: {
            // Restaurant has no resetToken field - store in location JSON or use separate table
          },
        });
        break;
      case "driver":
        await this.prisma.driver.update({
          where: { id: userId },
          data: {
            // Restaurant has no resetToken field - store in location JSON or use separate table
          },
        });
        break;
      default:
        await this.prisma.customer.update({
          where: { id: userId },
          data: {
            resetToken: token,
            resetTokenExpiresAt: expiresAt,
          },
        });
    }
  }

  private async clearPasswordResetToken(userId: string, userType: string) {
    await this.storePasswordResetToken(userId, userType, null);
  }

  private async findUserByResetToken(token: string) {
    // Check all user types for the reset token
    // Admin
    const admin = await this.prisma.admin.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpires: { gt: new Date() },
      },
    });
    if (admin) return { ...admin, userType: "admin" };

    // Customer
    const customer = await this.prisma.customer.findFirst({
      where: { resetToken: token, resetTokenExpiresAt: { gt: new Date() } },
    });
    if (customer) return { ...customer, userType: "customer" };

    // Note: Restaurant and Driver models don't have resetToken fields in the schema
    // If needed, these should be added to the schema or use a separate token table
    // For now, we skip them as they don't support password reset via token

    return null;
  }

  private async invalidateUserSessions(userId: string, userType: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        userType,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(),
      },
    });
  }
}
