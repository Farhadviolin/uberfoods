/* eslint-disable no-console */

const isDev = process.env.NODE_ENV !== "production";

type LogLevel = "error" | "warn" | "info" | "debug";

const logFn: Record<LogLevel, (...args: any[]) => void> = {
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  info: (...args: any[]) => console.info(...args),
  debug: (...args: any[]) => console.debug(...args),
};

export const logger = {
  error: (message: string, ...args: any[]) => {
    if (isDev) {
      logFn.error(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      logFn.warn(message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      logFn.info(message, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      logFn.debug(message, ...args);
    }
  },
};
