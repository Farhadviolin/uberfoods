import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get("user-agent") || "";
    const requestId = (req as any).requestId;
    const startTime = Date.now();

    // Log Request
    this.logger.log(`${method} ${originalUrl}`, {
      requestId,
      route: `${method} ${originalUrl}`,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    // Log Response
    res.on("finish", () => {
      const { statusCode } = res;
      const contentLength = res.get("content-length");
      const duration = Date.now() - startTime;

      const logData = {
        requestId,
        route: `${method} ${originalUrl}`,
        statusCode,
        durationMs: duration,
        ip,
        contentLength,
        timestamp: new Date().toISOString(),
      };

      if (statusCode >= 500) {
        this.logger.error(`${method} ${originalUrl} ${statusCode}`, logData);
      } else if (statusCode >= 400) {
        this.logger.warn(`${method} ${originalUrl} ${statusCode}`, logData);
      } else {
        this.logger.log(`${method} ${originalUrl} ${statusCode}`, logData);
      }
    });

    next();
  }
}
