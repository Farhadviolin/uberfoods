import { Driver } from '../types';
import { logger } from '../utils/logger';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';

export interface EmergencyEvent {
  id: string;
  type: 'health' | 'vehicle' | 'traffic' | 'behavior' | 'location';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
  resolved: boolean;
  actions: EmergencyAction[];
}

export interface EmergencyAction {
  id: string;
  type: 'call_emergency' | 'notify_support' | 'stop_vehicle' | 'send_location' | 'medical_alert';
  executed: boolean;
  timestamp: Date;
  result?: string;
}

export interface HealthMetrics {
  heartRate: number;
  fatigueLevel: number; // 0-100
  stressLevel: number; // 0-100
  sleepHours: number;
  lastBreak: Date;
  drivingHours: number;
  hydrationLevel?: number; // 0-100
}

export interface VehicleDiagnostics {
  batteryLevel: number;
  fuelLevel: number;
  engineTemp: number;
  tirePressure: { front: number; rear: number };
  brakeCondition: number; // 0-100
  lastService: Date;
  issues: VehicleIssue[];
}

export interface VehicleIssue {
  type: 'battery' | 'engine' | 'brakes' | 'tires' | 'transmission';
  severity: 'low' | 'medium' | 'high';
  description: string;
  requiresImmediate: boolean;
}

export class EmergencyIntelligenceService {
  private static instance: EmergencyIntelligenceService;
  private emergencyEvents: EmergencyEvent[] = [];
  private monitoringActive = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private vehicleCheckInterval: NodeJS.Timeout | null = null;

  public static getInstance(): EmergencyIntelligenceService {
    if (!EmergencyIntelligenceService.instance) {
      EmergencyIntelligenceService.instance = new EmergencyIntelligenceService();
    }
    return EmergencyIntelligenceService.instance;
  }

  /**
   * Startet das umfassende Monitoring-System
   */
  async startMonitoring(driver: Driver, options: {
    enableHealthMonitoring?: boolean;
    enableVehicleMonitoring?: boolean;
    enableBehaviorMonitoring?: boolean;
    emergencyContacts?: string[];
  } = {}): Promise<void> {
    if (this.monitoringActive) {
      logger.warn('Emergency monitoring already active', 'EmergencyIntelligenceService');
      return;
    }

    this.monitoringActive = true;
    logger.info('🚨 Starting Emergency Intelligence Monitoring', 'EmergencyIntelligenceService', {
      driverId: driver.id,
      options
    });

    const {
      enableHealthMonitoring = true,
      enableVehicleMonitoring = true,
      enableBehaviorMonitoring = true
    } = options;

    if (enableHealthMonitoring) {
      this.startHealthMonitoring(driver);
    }

    if (enableVehicleMonitoring) {
      this.startVehicleMonitoring(driver);
    }

    if (enableBehaviorMonitoring) {
      this.startBehaviorMonitoring(driver);
    }

    // Regelmäßige System-Checks
    setInterval(() => {
      this.performSystemCheck(driver);
    }, 30000); // Alle 30 Sekunden
  }

  /**
   * Stoppt das Monitoring-System
   */
  stopMonitoring(): void {
    this.monitoringActive = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.vehicleCheckInterval) {
      clearInterval(this.vehicleCheckInterval);
      this.vehicleCheckInterval = null;
    }

    logger.info('🛑 Emergency monitoring stopped', 'EmergencyIntelligenceService');
  }

  /**
   * Öffentliche Methoden für Health & Vehicle Metrics
   */
  async getHealthMetrics(driverId: string): Promise<HealthMetrics> {
    return this.collectHealthMetrics(driverId);
  }

  async getVehicleDiagnostics(driverId: string): Promise<VehicleDiagnostics> {
    return this.collectVehicleDiagnostics(driverId);
  }

  /**
   * Automatische Notfall-Erkennung
   */
  async detectEmergency(driverId: string, location: { lat: number; lng: number }): Promise<EmergencyEvent | null> {
    try {
      const response = await api.post(`/drivers/${driverId}/emergency/detect`, { location });
      if (response.data) {
        const backendEvent = response.data;
        const event: EmergencyEvent = {
          id: backendEvent.id,
          type: backendEvent.type,
          severity: backendEvent.severity,
          description: backendEvent.reason || 'Notfall erkannt',
          timestamp: new Date(backendEvent.createdAt),
          location: backendEvent.location,
          resolved: backendEvent.status === 'resolved',
          actions: []
        };
        this.emergencyEvents.push(event);
        return event;
      }
      return null;
    } catch (error) {
      logger.error('Fehler bei automatischer Notfall-Erkennung', 'EmergencyIntelligenceService', error);
      return null;
    }
  }

  /**
   * Health Monitoring System
   */
  private startHealthMonitoring(driver: Driver): void {
    logger.info('❤️ Starting Health Monitoring', 'EmergencyIntelligenceService');

    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthMetrics = await this.collectHealthMetrics(driver.id);

        // Fatigue Detection
        if (healthMetrics.fatigueLevel > 85) {
          await this.triggerEmergency('health', 'critical', 'Extreme Ermüdung erkannt', {
            fatigueLevel: healthMetrics.fatigueLevel
          });
        } else if (healthMetrics.fatigueLevel > 70) {
          await this.triggerEmergency('health', 'high', 'Hohe Ermüdung erkannt', {
            fatigueLevel: healthMetrics.fatigueLevel
          });
        }

        // Stress Detection
        if (healthMetrics.stressLevel > 80) {
          await this.triggerEmergency('health', 'high', 'Hoher Stress erkannt', {
            stressLevel: healthMetrics.stressLevel
          });
        }

        // Break Reminder
        const timeSinceLastBreak = Date.now() - healthMetrics.lastBreak.getTime();
        if (timeSinceLastBreak > 2 * 60 * 60 * 1000) { // 2 Stunden
          await this.triggerEmergency('health', 'medium', 'Pause seit 2 Stunden nicht gemacht', {
            hoursSinceBreak: timeSinceLastBreak / (60 * 60 * 1000)
          });
        }

        // Hydration Alert
        if (healthMetrics.hydrationLevel && healthMetrics.hydrationLevel < 30) {
          await this.triggerEmergency('health', 'medium', 'Dehydrierung erkannt', {
            hydrationLevel: healthMetrics.hydrationLevel
          });
        }

      } catch (error) {
        logger.error('Health monitoring error', 'EmergencyIntelligenceService', error);
      }
    }, 60000); // Alle Minute
  }

  /**
   * Vehicle Diagnostics Monitoring
   */
  private startVehicleMonitoring(driver: Driver): void {
    logger.info('🚗 Starting Vehicle Monitoring', 'EmergencyIntelligenceService');

    this.vehicleCheckInterval = setInterval(async () => {
      try {
        const diagnostics = await this.collectVehicleDiagnostics(driver.id);

        // Critical Issues
        const criticalIssues = diagnostics.issues.filter(i => i.requiresImmediate);
        if (criticalIssues.length > 0) {
          await this.triggerEmergency('vehicle', 'critical', 'Kritisches Fahrzeugproblem erkannt', {
            issues: criticalIssues
          });
        }

        // Battery Alert
        if (diagnostics.batteryLevel < 15) {
          await this.triggerEmergency('vehicle', 'high', 'Batterie schwach', {
            batteryLevel: diagnostics.batteryLevel
          });
        }

        // Engine Temperature
        if (diagnostics.engineTemp > 110) {
          await this.triggerEmergency('vehicle', 'high', 'Motor überhitzt', {
            engineTemp: diagnostics.engineTemp
          });
        }

        // Brake Condition
        if (diagnostics.brakeCondition < 20) {
          await this.triggerEmergency('vehicle', 'high', 'Bremsen verschlissen', {
            brakeCondition: diagnostics.brakeCondition
          });
        }

        // Tire Pressure
        if (diagnostics.tirePressure.front < 1.8 || diagnostics.tirePressure.rear < 1.8) {
          await this.triggerEmergency('vehicle', 'medium', 'Reifendruck zu niedrig', {
            tirePressure: diagnostics.tirePressure
          });
        }

      } catch (error) {
        logger.error('Vehicle monitoring error', 'EmergencyIntelligenceService', error);
      }
    }, 300000); // Alle 5 Minuten
  }

  /**
   * Behavior Monitoring (Driving Pattern Analysis)
   */
  private startBehaviorMonitoring(driver: Driver): void {
    logger.info('👁️ Starting Behavior Monitoring', 'EmergencyIntelligenceService');

    // Monitor für aggressive Fahrweise, plötzliche Stops, etc.
    // Hier würden Accelerometer/GPS-Daten analysiert werden

    // Sudden Stop Detection (simuliert)
    setInterval(async () => {
      const suddenStopDetected = Math.random() > 0.99; // 1% Chance für Demo
      if (suddenStopDetected) {
        await this.triggerEmergency('behavior', 'high', 'Plötzlicher Halt erkannt - möglicher Unfall', {
          speedBeforeStop: Math.floor(Math.random() * 50) + 30
        });
      }
    }, 10000); // Alle 10 Sekunden
  }

  /**
   * Emergency Trigger System
   */
  private async triggerEmergency(
    type: EmergencyEvent['type'],
    severity: EmergencyEvent['severity'],
    description: string,
    metadata: any = {}
  ): Promise<void> {
    const emergency: EmergencyEvent = {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      description,
      timestamp: new Date(),
      resolved: false,
      actions: []
    };

    // Automatische Actions basierend auf Schweregrad
    if (severity === 'critical') {
      emergency.actions = [
        {
          id: `action_${Date.now()}_emergency_call`,
          type: 'call_emergency',
          executed: false,
          timestamp: new Date()
        },
        {
          id: `action_${Date.now()}_notify_support`,
          type: 'notify_support',
          executed: false,
          timestamp: new Date()
        },
        {
          id: `action_${Date.now()}_send_location`,
          type: 'send_location',
          executed: false,
          timestamp: new Date()
        }
      ];
    } else if (severity === 'high') {
      emergency.actions = [
        {
          id: `action_${Date.now()}_notify_support`,
          type: 'notify_support',
          executed: false,
          timestamp: new Date()
        },
        {
          id: `action_${Date.now()}_send_location`,
          type: 'send_location',
          executed: false,
          timestamp: new Date()
        }
      ];
    }

    this.emergencyEvents.unshift(emergency);

    logger.warn('🚨 Emergency triggered', 'EmergencyIntelligenceService', {
      type,
      severity,
      description,
      metadata
    });

    // Execute immediate actions
    await this.executeEmergencyActions(emergency);

    // Limit emergency history
    if (this.emergencyEvents.length > 50) {
      this.emergencyEvents = this.emergencyEvents.slice(0, 50);
    }
  }

  /**
   * Execute Emergency Actions
   */
  private async executeEmergencyActions(emergency: EmergencyEvent): Promise<void> {
    for (const action of emergency.actions) {
      if (action.executed) continue;

      try {
        switch (action.type) {
          case 'call_emergency':
            await this.callEmergency();
            action.result = 'Emergency call initiated';
            break;

          case 'notify_support':
            await this.notifySupport(emergency);
            action.result = 'Support notified';
            break;

          case 'send_location':
            await this.sendLocation();
            action.result = 'Location sent';
            break;

          case 'stop_vehicle':
            await this.stopVehicle();
            action.result = 'Vehicle stop initiated';
            break;

          case 'medical_alert':
            await this.medicalAlert(emergency);
            action.result = 'Medical alert sent';
            break;
        }

        action.executed = true;
        logger.info('Emergency action executed', 'EmergencyIntelligenceService', {
          action: action.type,
          result: action.result
        });

      } catch (error) {
        logger.error('Emergency action failed', 'EmergencyIntelligenceService', {
          action: action.type,
          error
        });
        action.result = `Failed: ${error}`;
      }
    }
  }

  /**
   * Emergency Action Implementations
   */
  private async callEmergency(): Promise<void> {
    // In real implementation: Call emergency services
    logger.warn('🚨 CALLING EMERGENCY SERVICES: 112', 'EmergencyIntelligenceService');

    // Fallback: Show alert and try to call
    if (window.confirm('🚨 KRITISCHER NOTFALL!\n\nNotruf 112 wählen?')) {
      window.location.href = 'tel:112';
    }
  }

  private async notifySupport(emergency: EmergencyEvent): Promise<void> {
    // In real implementation: Send to support system via API
    logger.info('📞 Notifying support team', 'EmergencyIntelligenceService', {
      emergency: emergency.description,
      severity: emergency.severity
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async sendLocation(): Promise<void> {
    // In real implementation: Get GPS location and send to emergency contacts
    logger.info('📍 Sending location to emergency contacts', 'EmergencyIntelligenceService');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          logger.info('Location sent', 'EmergencyIntelligenceService', { latitude, longitude });
        },
        (error) => {
          logger.error('Failed to get location', 'EmergencyIntelligenceService', error);
        }
      );
    }
  }

  private async stopVehicle(): Promise<void> {
    // In real implementation: Interface with vehicle systems
    logger.warn('🛑 Initiating vehicle emergency stop', 'EmergencyIntelligenceService');

    // Show emergency stop alert
    alert('🚨 NOTSTOPP! Fahrzeug wird angehalten.\n\nBitte sofort anhalten!');
  }

  private async medicalAlert(emergency: EmergencyEvent): Promise<void> {
    logger.warn('🏥 Medical alert triggered', 'EmergencyIntelligenceService', {
      emergency: emergency.description
    });
  }

  /**
   * Data Collection Methods
   * 
   * WICHTIG: Diese Methoden versuchen zuerst Backend-APIs zu verwenden.
   * Fallback zu Mock-Daten nur wenn Backend nicht verfügbar ist.
   * 
   * Benötigte Backend-Endpoints:
   * - GET /drivers/{driverId}/emergency/health
   * - GET /drivers/{driverId}/emergency/vehicle
   */
  private async collectHealthMetrics(driverId?: string): Promise<HealthMetrics> {
    if (!driverId) {
      throw new Error('Driver ID erforderlich für Health Metrics');
    }

    try {
      const response = await api.get(`/drivers/${driverId}/emergency/health`);
      const backendData = response.data;

      logger.debug('Health Metrics von Backend geladen', 'EmergencyIntelligenceService');

      return {
        heartRate: backendData.heartRate,
        fatigueLevel: backendData.fatigueLevel,
        stressLevel: backendData.stressLevel,
        sleepHours: backendData.sleepHours,
        lastBreak: backendData.lastBreak ? new Date(backendData.lastBreak) : null,
        drivingHours: backendData.drivingHours,
        hydrationLevel: backendData.hydrationLevel,
        warnings: backendData.warnings || []
      };
    } catch (error: unknown) {
      logger.error('Health Metrics API fehlgeschlagen', 'EmergencyIntelligenceService', error);
      throw error; // Keine Fallbacks mehr - echte API muss funktionieren
    }
  }

  private async collectVehicleDiagnostics(driverId?: string): Promise<VehicleDiagnostics> {
    if (!driverId) {
      throw new Error('Driver ID erforderlich für Vehicle Diagnostics');
    }

    try {
      const response = await api.get(`/drivers/${driverId}/emergency/vehicle`);
      const backendData = response.data;

      logger.debug('Vehicle Diagnostics von Backend geladen', 'EmergencyIntelligenceService');

      return {
        batteryLevel: backendData.batteryLevel,
        fuelLevel: backendData.fuelLevel,
        engineTemp: backendData.engineTemp,
        tirePressure: backendData.tirePressure,
        brakeCondition: backendData.brakeCondition,
        lastService: backendData.lastService ? new Date(backendData.lastService) : null,
        issues: backendData.issues || []
      };
    } catch (error: unknown) {
      logger.error('Vehicle Diagnostics API fehlgeschlagen', 'EmergencyIntelligenceService', error);
      throw error; // Keine Fallbacks mehr - echte API muss funktionieren
    }
  }

  /**
   * System Health Check
   */
  private async performSystemCheck(driver: Driver): Promise<void> {
    // Check if monitoring is still active
    if (!this.monitoringActive) return;

    // Check GPS availability
    if (!navigator.geolocation) {
      await this.triggerEmergency('location', 'medium', 'GPS nicht verfügbar', {});
    }

    // Check internet connectivity
    if (!navigator.onLine) {
      await this.triggerEmergency('behavior', 'low', 'Offline-Modus aktiv', {});
    }

    // Battery level check for device
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        if (battery.level < 0.15) {
          await this.triggerEmergency('vehicle', 'medium', 'Geräte-Batterie schwach', {
            deviceBattery: battery.level * 100
          });
        }
      } catch (error) {
        // Battery API not supported or failed
      }
    }
  }

  /**
   * Public API Methods
   */
  getEmergencyEvents(): EmergencyEvent[] {
    return [...this.emergencyEvents];
  }

  getActiveEmergencies(): EmergencyEvent[] {
    return this.emergencyEvents.filter(e => !e.resolved);
  }

  async resolveEmergency(emergencyId: string): Promise<void> {
    const emergency = this.emergencyEvents.find(e => e.id === emergencyId);
    if (emergency) {
      emergency.resolved = true;
      logger.info('Emergency resolved', 'EmergencyIntelligenceService', { emergencyId });
    }
  }

  getMonitoringStatus(): boolean {
    return this.monitoringActive;
  }

  async triggerManualEmergency(type: EmergencyEvent['type'], description: string): Promise<void> {
    await this.triggerEmergency(type, 'high', description, { manual: true });
  }
}

// Export Singleton-Instanz
export const emergencyIntelligenceService = EmergencyIntelligenceService.getInstance();
