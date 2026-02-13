import { useState, useEffect } from 'react';
import { healthCheckService, HealthStatus } from '../services/healthCheckService';

/**
 * Hook for monitoring application health
 */
export function useHealthCheck() {
  const [status, setStatus] = useState<HealthStatus>(healthCheckService.getStatus());

  useEffect(() => {
    healthCheckService.setStatusChangeCallback((newStatus) => {
      setStatus(newStatus);
    });

    healthCheckService.start();

    return () => {
      healthCheckService.stop();
    };
  }, []);

  return {
    status: status.status,
    checks: status.checks,
    timestamp: status.timestamp,
    isHealthy: status.status === 'healthy',
    isDegraded: status.status === 'degraded',
    isUnhealthy: status.status === 'unhealthy',
  };
}

