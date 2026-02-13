import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as helmet from "helmet";

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  constructor() {
    this.logger.log("Security middleware initialized");
  }

  use(req: Request, res: Response, next: NextFunction) {
    const featureSecurityHeaders =
      process.env.FEATURE_SECURITY_HEADERS === "true";
    const cspReportOnly = process.env.CSP_REPORT_ONLY === "true";

    // Trust proxy configuration for reverse proxy deployments
    const trustProxy = process.env.TRUST_PROXY === "true";
    if (trustProxy) {
      // Trust first proxy in chain
      req.app.set("trust proxy", 1);
    }

    if (featureSecurityHeaders) {
      // Apply Helmet security headers
      helmet.default({
        contentSecurityPolicy: cspReportOnly
          ? {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // For admin panel styles
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'"],
                connectSrc: ["'self'"],
                reportUri: "/csp-report",
              },
              reportOnly: true,
            }
          : false,
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        frameguard: { action: "deny" },
      })(req, res, next);

      // Add custom security headers
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      res.setHeader(
        "Permissions-Policy",
        "geolocation=(), camera=(), microphone=(), payment=(self)",
      );

      // Remove server header for security
      res.removeHeader("X-Powered-By");

      this.logger.debug(
        `Applied security headers to ${req.method} ${req.path}`,
      );
    } else {
      // Minimal security headers even when feature is disabled
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.removeHeader("X-Powered-By");
    }

    next();
  }
}
