/**
 * Logging Service
 * Centralized logging with different log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
  data?: any;
  stack?: string;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private currentLevel: LogLevel = LogLevel.INFO;
  private onLogCallback?: (entry: LogEntry) => void;

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (level < this.currentLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      data,
    };

    // Add stack trace for errors
    if (level === LogLevel.ERROR && data instanceof Error) {
      entry.stack = data.stack;
    }

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Call callback if set
    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }

    // Console output
    const logMethod = this.getConsoleMethod(level);
    const prefix = context ? `[${context}]` : '';
    logMethod(`${prefix} ${message}`, data || '');
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  setLogCallback(callback: (entry: LogEntry) => void): void {
    this.onLogCallback = callback;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const loggingService = new LoggingService();

