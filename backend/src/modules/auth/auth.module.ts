import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SocialAuthService } from "./social-auth.service";
import { MfaService } from "./mfa.service";
import { DatabaseModule } from "../../common/database/database.module";
import { RbacModule } from "../rbac/rbac.module";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    DatabaseModule,
    RbacModule, // Import RbacModule to use RBACService in guards
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error(
            "JWT_SECRET environment variable is required but not set",
          );
        }
        return {
          secret,
          signOptions: { expiresIn: "24h" },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, SocialAuthService, MfaService],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, SocialAuthService, MfaService],
})
export class AuthModule {}
