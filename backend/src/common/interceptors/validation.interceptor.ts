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
        if (error instanceof ValidationError) {
          const messages = error.constraints
            ? Object.values(error.constraints)
            : ["Validation failed"];

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
