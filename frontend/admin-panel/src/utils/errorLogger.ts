/**
 * Error Logger mit Debouncing und Gruppierung
 * Verhindert Spam von wiederholten Fehlermeldungen in der Konsole
 */
/* eslint-disable no-console */

interface ErrorLog {
  message: string;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
}

class ErrorLogger {
  private errorLogs = new Map<string, ErrorLog>();
  private readonly debounceTime = 2000; // 2 Sekunden
  private readonly maxErrorsPerType = 5; // Max 5 gleiche Fehler loggen
  private flushTimer: NodeJS.Timeout | null = null;

  private getErrorKey(error: unknown): string {
    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      const msg = (error as { message?: unknown }).message;
      if (typeof msg === 'string') {
        message = msg;
      }
    } else {
      message = String(error);
    }
    // Erstelle einen Key basierend auf der Fehlermeldung
    return message.substring(0, 100); // Erste 100 Zeichen als Key
  }

  private shouldLog(_errorKey: string, log: ErrorLog): boolean {
    // Logge nur wenn:
    // 1. Erster Fehler dieser Art
    // 2. Oder wenn genug Zeit vergangen ist seit letztem Log
    // 3. Oder wenn wir noch nicht das Maximum erreicht haben
    const timeSinceLastLog = Date.now() - log.lastOccurrence;
    
    if (log.count === 1) return true; // Erster Fehler immer loggen
    if (timeSinceLastLog > this.debounceTime) return true; // Nach Debounce-Zeit wieder loggen
    if (log.count <= this.maxErrorsPerType) return true; // Bis zum Maximum loggen
    
    return false; // Sonst nicht loggen
  }

  logError(error: unknown, context?: string): void {
    const errorKey = this.getErrorKey(error);
    const now = Date.now();
    
    // Hole oder erstelle Log-Eintrag
    let log = this.errorLogs.get(errorKey);
    if (!log) {
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else {
        message = String(error);
      }
      
      log = {
        message,
        count: 0,
        firstOccurrence: now,
        lastOccurrence: now,
      };
      this.errorLogs.set(errorKey, log);
    }

    // Aktualisiere Zähler
    log.count++;
    log.lastOccurrence = now;

    // Entscheide ob geloggt werden soll
    if (this.shouldLog(errorKey, log)) {
      if (log.count === 1) {
        // Erster Fehler - normal loggen
        console.error(`❌ ${context ? `[${context}] ` : ''}${log.message}`, error);
      } else {
        // Wiederholter Fehler - mit Zähler loggen
        console.error(
          `❌ ${context ? `[${context}] ` : ''}${log.message} ` +
          `(wiederholt ${log.count}x, zuletzt vor ${Math.round((now - log.firstOccurrence) / 1000)}s)`,
          error
        );
      }
    } else if (log.count === this.maxErrorsPerType + 1) {
      // Nach Maximum: Eine Warnung dass weitere Fehler unterdrückt werden
      console.warn(
        `⚠️ Weitere Fehler vom Typ "${log.message.substring(0, 50)}..." werden unterdrückt ` +
        `(bereits ${log.count}x aufgetreten)`
      );
    }

    // Auto-Flush nach einer Weile
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, 10000); // Nach 10 Sekunden Inaktivität Logs zurücksetzen
  }

  logWarning(message: string, context?: string): void {
    // Warnings werden nicht gedebounced, aber auch nicht so oft wiederholt
    console.warn(`⚠️ ${context ? `[${context}] ` : ''}${message}`);
  }

  logInfo(message: string, context?: string): void {
    // Info-Logs werden nicht gedebounced
    console.log(`ℹ️ ${context ? `[${context}] ` : ''}${message}`);
  }

  flush(): void {
    // Setze alle Logs zurück
    this.errorLogs.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  getStats(): { totalErrors: number; uniqueErrors: number } {
    let totalErrors = 0;
    this.errorLogs.forEach(log => {
      totalErrors += log.count;
    });
    return {
      totalErrors,
      uniqueErrors: this.errorLogs.size,
    };
  }
}

// Singleton-Instanz
export const errorLogger = new ErrorLogger();

// Convenience-Funktionen
export const logError = (error: unknown, context?: string) => {
  errorLogger.logError(error, context);
};

export const logWarning = (message: string, context?: string) => {
  errorLogger.logWarning(message, context);
};

export const logInfo = (message: string, context?: string) => {
  errorLogger.logInfo(message, context);
};

/**
 * Development-only logging - wird in Production nicht ausgeführt
 */
export const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] ${message}`, ...args);
  }
};

export const devWarn = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[DEV] ${message}`, ...args);
  }
};

export const devError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[DEV] ${message}`, ...args);
  }
};

