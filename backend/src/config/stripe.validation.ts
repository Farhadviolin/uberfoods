import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { IsNotEmpty, IsString, validateSync } from "class-validator";

class StripeEnvironmentVariables {
  @IsNotEmpty()
  @IsString()
  STRIPE_SECRET_KEY!: string;

  @IsNotEmpty()
  @IsString()
  STRIPE_WEBHOOK_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  STRIPE_PRICE_BASIC!: string;

  @IsNotEmpty()
  @IsString()
  STRIPE_PRICE_PRO!: string;

  @IsNotEmpty()
  @IsString()
  STRIPE_PRICE_FULLTIME!: string;

  @IsNotEmpty()
  @IsString()
  STRIPE_PRICE_ENTERPRISE!: string;
}

export function validateStripeConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(StripeEnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");
    throw new BadRequestException(
      `Stripe configuration invalid: ${errorMessages}`,
    );
  }

  return validatedConfig;
}
