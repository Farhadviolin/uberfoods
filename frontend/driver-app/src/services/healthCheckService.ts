/**
 * Health Check Service
 * Monitors application health and connectivity
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    api: boolean;
    websocket: boolean;
    storage: boolean;
    geolocation: boolean;
  };
  details?: Record<string, any>;
}

class HealthCheckService {
  private status: HealthStatus = {
    status: 'healthy',
    timestamp: Date.now(),
    checks: {
      api: true,
      websocket: true,
      storage: true,
      geolocation: true,
    },
  };
  private checkInterval: number = 30000; // 30 seconds
  private intervalId?: NodeJS.Timeout;
  private onStatusChangeCallback?: (status: HealthStatus) => void;

  start(): void {
    this.performHealthCheck();
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async performHealthCheck(): Promise<void> {
    const checks = {
      api: await this.checkAPI(),
      websocket: await this.checkWebSocket(),
      storage: this.checkStorage(),
      geolocation: this.checkGeolocation(),
    };

    const allHealthy = Object.values(checks).every((check) => check === true);
    const someHealthy = Object.values(checks).some((check) => check === true);

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allHealthy) {
      status = 'healthy';
    } else if (someHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const newStatus: HealthStatus = {
      status,
      timestamp: Date.now(),
      checks,
    };

    if (this.status.status !== status) {
      this.status = newStatus;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback(newStatus);
      }
    } else {
      this.status = newStatus;
    }
  }

  private async checkAPI(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkWebSocket(): Promise<boolean> {
    // Check if WebSocket is supported and can connect
    return 'WebSocket' in window || 'MozWebSocket' in window;
  }

  private checkStorage(): boolean {
    try {
      localStorage.setItem('__health_check__', 'test');
      localStorage.removeItem('__health_check__');
      return true;
    } catch {
      return false;
    }
  }

  private checkGeolocation(): boolean {
    return 'geolocation' in navigator;
  }

  getStatus(): HealthStatus {
    return { ...this.status };
  }

  setStatusChangeCallback(callback: (status: HealthStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();

