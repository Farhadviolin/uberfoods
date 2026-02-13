import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { ValidationError } from "class-validator";

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof ValidationError || error?.response?.message) {
          const messages = Array.isArray(error.response?.message)
            ? error.response.message
            : [error.response?.message || error.message];

          throw new BadRequestException({
            statusCode: 400,
            message: messages,
            error: "Validation Error",
            timestamp: new Date().toISOString(),
          });
        }
        throw error;
      }),
    );
  }
}
