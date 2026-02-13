import {
  Injectable,
  PipeTransform,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { validate, ValidationError, ValidatorOptions } from "class-validator";
import { plainToInstance } from "class-transformer";
import { EncryptionUtil } from "../utils/encryption.util";

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  constructor(private encryptionUtil: EncryptionUtil) {}

  async transform(value: any, { metatype }: any) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize input first
    const sanitizedValue = this.sanitizeInput(value);

    // Transform to class instance
    const object = plainToInstance(metatype, sanitizedValue);

    // Validate the object
    const validatorOptions: ValidatorOptions = {
      whitelist: true,
      forbidNonWhitelisted: true,
    };
    const errors = await validate(object, validatorOptions);

    if (errors.length > 0) {
      const formattedErrors = this.formatValidationErrors(errors);
      this.logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);
      throw new BadRequestException({
        message: "Validation failed",
        errors: formattedErrors,
      });
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeInput(value: any): any {
    if (typeof value === "string") {
      // Remove null bytes and other dangerous characters
      return value.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeInput(item));
    }

    if (typeof value === "object" && value !== null) {
      const sanitized = { ...value };
      for (const key in sanitized) {
        if (sanitized.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeInput(sanitized[key]);
        }
      }
      return sanitized;
    }

    return value;
  }

  private formatValidationErrors(errors: ValidationError[]): any {
    return errors.reduce((acc, error) => {
      const constraints = error.constraints;
      if (constraints) {
        acc[error.property] = Object.values(constraints);
      }

      if (error.children && error.children.length > 0) {
        acc[error.property] = this.formatValidationErrors(error.children);
      }

      return acc;
    }, {});
  }
}
