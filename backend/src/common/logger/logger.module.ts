import { Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import * as path from "path";
import * as fs from "fs";

const logDir = path.join(process.cwd(), "logs");

// Erstelle logs-Verzeichnis falls nicht vorhanden
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

@Module({
  imports: [
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: { service: "UberFood-food-api" },
      transports: [
        // Console Transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context, ...meta }) => {
                const contextStr = context ? `[${context}]` : "";
                const metaStr = Object.keys(meta).length
                  ? JSON.stringify(meta)
                  : "";
                return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
              },
            ),
          ),
        }),
        // File Transport - Errors
        new winston.transports.File({
          filename: path.join(logDir, "error.log"),
          level: "error",
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // File Transport - All logs
        new winston.transports.File({
          filename: path.join(logDir, "combined.log"),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    }),
  ],
})
export class LoggerModule {}
