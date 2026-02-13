import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { Response } from "express";
import { IdempotencyService } from "../services/idempotency.service";
import {
  IDEMPOTENT_KEY,
  IdempotentOptions,
} from "../decorators/idempotent.decorator";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private reflector: Reflector,
    private idempotencyService: IdempotencyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const options = this.reflector.get<IdempotentOptions>(
      IDEMPOTENT_KEY,
      context.getHandler(),
    );

    if (!options) {
      // Not an idempotent operation
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();
    const idempotencyKey = request.headers[options.headerName.toLowerCase()];

    if (!idempotencyKey) {
      throw new BadRequestException(
        `Missing required header: ${options.headerName}`,
      );
    }

    if (!this.idempotencyService.validateIdempotencyKey(idempotencyKey)) {
      throw new BadRequestException(`Invalid ${options.headerName} format`);
    }

    // Check if this operation was already processed
    const cachedResult =
      await this.idempotencyService.checkIdempotency(idempotencyKey);

    if (cachedResult) {
      // Return the cached response
      this.logger.log(
        `Returning cached response for idempotency key: ${idempotencyKey}`,
      );

      // Set cached headers
      Object.entries(cachedResult.headers).forEach(([key, value]) => {
        response.setHeader(key, value);
      });

      response.status(cachedResult.statusCode);
      return of(cachedResult.response);
    }

    // Proceed with the operation and cache the result
    return next.handle().pipe(
      tap(async (responseData) => {
        // Only cache successful responses
        if (response.statusCode >= 200 && response.statusCode < 300) {
          const headersToCache: Record<string, string> = {
            contentType: String(
              response.getHeader("content-type") || "application/json",
            ),
            xRequestId: String(response.getHeader("x-request-id") || ""),
          };

          await this.idempotencyService.storeIdempotency(
            idempotencyKey,
            responseData,
            response.statusCode,
            headersToCache,
            options.ttlSeconds,
          );
        }
      }),
    );
  }
}
