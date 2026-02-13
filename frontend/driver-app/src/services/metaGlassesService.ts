import { MetaGlassesState, AROverlay, ARNavigationStep, ARSettings, RouteOptimization, Order } from '../types';
import { logger } from '../utils/logger';

export class MetaGlassesService {
  private static instance: MetaGlassesService;
  private state: MetaGlassesState;
  private overlayQueue: AROverlay[] = [];
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  public static getInstance(): MetaGlassesService {
    if (!MetaGlassesService.instance) {
      MetaGlassesService.instance = new MetaGlassesService();
    }
    return MetaGlassesService.instance;
  }

  constructor() {
    this.state = {
      connected: false,
      batteryLevel: 100,
      temperature: 25,
      lastSync: new Date(),
      arEnabled: false,
      navigationSteps: [],
      settings: {
        enabled: true,
        overlayOpacity: 0.8,
        voiceGuidance: true,
        hapticFeedback: true,
        autoZoom: true,
        nightMode: false,
        showTraffic: true,
        showPointsOfInterest: true
      }
    };

    this.initializeConnectionMonitoring();
  }

  /**
   * Initialisiert die Verbindung zu Meta Glasses
   */
  async connect(driverId?: string, deviceId?: string): Promise<boolean> {
    try {
      logger.info('🔌 Attempting to connect to Meta Glasses...', 'MetaGlassesService');

      // Backend-Verbindung herstellen
      if (driverId && deviceId) {
        try {
          const { DriverService } = await import('./driverService');
          await DriverService.connectMetaGlasses(driverId, deviceId);
          logger.info('✅ Backend connection established', 'MetaGlassesService');
        } catch (error) {
          logger.warn('⚠️ Backend connection failed, using local mode', 'MetaGlassesService', error);
        }
      }

      // Simuliere Verbindungsaufbau
      await this.simulateConnection();

      this.state.connected = true;
      this.state.arEnabled = true;
      this.state.lastSync = new Date();

      logger.info('✅ Successfully connected to Meta Glasses', 'MetaGlassesService');

      // Zeige Willkommens-Overlay
      this.showOverlay({
        type: 'information',
        position: 'center',
        content: 'Willkommen bei Meta Glasses AR-Navigation! 👓',
        icon: '👓',
        duration: 3000,
        priority: 'low'
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to connect to Meta Glasses', 'MetaGlassesService', error);
      return false;
    }
  }

  /**
   * Trennt die Verbindung zu Meta Glasses
   */
  disconnect(): void {
    this.state.connected = false;
    this.state.arEnabled = false;
    this.clearOverlays();
    this.state.navigationSteps = [];

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    logger.info('🔌 Disconnected from Meta Glasses', 'MetaGlassesService');
  }

  /**
   * Startet AR-Navigation für eine Route
   */
  async startNavigation(route: RouteOptimization, orders: Order[]): Promise<void> {
    if (!this.state.connected || !this.state.arEnabled) {
      throw new Error('Meta Glasses not connected or AR not enabled');
    }

    logger.info('🚀 Starting AR Navigation', 'MetaGlassesService', {
      routePoints: route.optimizedRoute.length,
      ordersCount: orders.length
    });

    // Konvertiere Route zu AR Navigation Steps
    const navigationSteps = await this.convertRouteToARSteps(route, orders);
    this.state.navigationSteps = navigationSteps;

    // Zeige Start-Overlay
    this.showOverlay({
      type: 'navigation',
      position: 'top',
      content: `Navigation gestartet. ${route.optimizedRoute.length - 1} Stopps.`,
      icon: '🚗',
      duration: 5000,
      priority: 'high'
    });

    // Starte Schritt-für-Schritt Navigation
    this.startStepByStepNavigation();
  }

  /**
   * Zeigt ein AR-Overlay an
   */
  showOverlay(overlay: AROverlay): void {
    if (!this.state.connected) return;

    // Füge zur Queue hinzu
    this.overlayQueue.push(overlay);

    // Sortiere nach Priorität
    this.overlayQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Zeige nächstes Overlay
    this.displayNextOverlay();

    logger.info('👁️ Showing AR Overlay', 'MetaGlassesService', {
      type: overlay.type,
      content: overlay.content,
      priority: overlay.priority
    });
  }

  /**
   * Aktualisiert AR-Einstellungen
   */
  updateSettings(settings: Partial<ARSettings>): void {
    this.state.settings = { ...this.state.settings, ...settings };

    logger.info('⚙️ Updated AR Settings', 'MetaGlassesService', settings);

    // Zeige Bestätigung
    if (settings.enabled !== undefined) {
      this.showOverlay({
        type: 'information',
        position: 'bottom',
        content: `AR ${settings.enabled ? 'aktiviert' : 'deaktiviert'}`,
        icon: settings.enabled ? '✅' : '❌',
        duration: 2000,
        priority: 'low'
      });
    }
  }

  /**
   * Holt den aktuellen Status der Meta Glasses
   */
  getState(): MetaGlassesState {
    return { ...this.state };
  }

  /**
   * Simuliert die Verbindung zu Meta Glasses (für Demo)
   */
  private async simulateConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 90% Erfolgsrate für Demo
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('Connection failed'));
        }
      }, 2000);
    });
  }

  /**
   * Initialisiert die Verbindungsüberwachung
   */
  private initializeConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(async () => {
      if (this.state.connected) {
        try {
          // Simuliere Batterie- und Temperatur-Updates
          this.state.batteryLevel = Math.max(0, this.state.batteryLevel - Math.random() * 2);
          this.state.temperature = 25 + Math.random() * 10;

          // Warnung bei niedrigem Akku
          if (this.state.batteryLevel < 20 && this.state.batteryLevel > 15) {
            this.showOverlay({
              type: 'warning',
              position: 'top',
              content: 'Meta Glasses Akku niedrig!',
              icon: '🔋',
              priority: 'high'
            });
          }

          // Kritische Warnung bei sehr niedrigem Akku
          if (this.state.batteryLevel < 10) {
            this.showOverlay({
              type: 'warning',
              position: 'center',
              content: 'Meta Glasses Akku kritisch! Bitte laden.',
              icon: '⚠️',
              priority: 'critical',
              interactive: true,
              action: () => {
                alert('Bitte Meta Glasses aufladen!');
              }
            });
          }

          // Überhitzungswarnung
          if (this.state.temperature > 35) {
            this.showOverlay({
              type: 'warning',
              position: 'right',
              content: 'Meta Glasses überhitzt!',
              icon: '🔥',
              priority: 'high'
            });
          }

        } catch (error) {
          logger.warn('Connection check failed', 'MetaGlassesService', error);
          // Versuche Reconnect
          this.attemptReconnect();
        }
      }
    }, 30000); // Alle 30 Sekunden
  }

  /**
   * Konvertiert eine Route zu AR Navigation Steps
   */
  private async convertRouteToARSteps(route: RouteOptimization, orders: Order[]): Promise<ARNavigationStep[]> {
    const steps: ARNavigationStep[] = [];

    for (let i = 0; i < route.optimizedRoute.length - 1; i++) {
      const current = route.optimizedRoute[i];
      const next = route.optimizedRoute[i + 1];

      // Berechne Distanz und Richtung
      const distance = this.calculateDistance(current.location, next.location);
      const bearing = this.calculateBearing(current.location, next.location);
      const turnType = this.determineTurnType(bearing);

      // Erstelle Anweisung
      const instruction = this.generateNavigationInstruction(next, turnType, distance);

      steps.push({
        id: `step_${i}`,
        instruction,
        distance,
        duration: Math.round(distance / 30 * 60), // 30 km/h Durchschnitt
        turnType,
        streetName: next.name,
        landmarks: this.findNearbyLandmarks(next.location),
        visualCue: this.generateVisualCue(next),
        completed: false
      });
    }

    return steps;
  }

  /**
   * Startet Schritt-für-Schritt Navigation
   */
  private startStepByStepNavigation(): void {
    let currentStepIndex = 0;

    const navigationInterval = setInterval(() => {
      if (currentStepIndex >= this.state.navigationSteps.length) {
        clearInterval(navigationInterval);

        // Zeige Abschluss-Overlay
        this.showOverlay({
          type: 'celebration',
          position: 'center',
          content: '🎉 Navigation abgeschlossen!',
          icon: '🎯',
          duration: 5000,
          priority: 'high'
        });

        return;
      }

      const step = this.state.navigationSteps[currentStepIndex];

      // Simuliere Annäherung an den nächsten Punkt
      const simulatedDistance = step.distance - Math.random() * 50;

      if (simulatedDistance < 100) { // 100m vor dem Ziel
        this.showNavigationOverlay(step);
        step.completed = true;
        currentStepIndex++;
      }
    }, 5000); // Alle 5 Sekunden aktualisieren
  }

  /**
   * Zeigt Navigation-Overlay für aktuellen Schritt
   */
  private showNavigationOverlay(step: ARNavigationStep): void {
    const overlay: AROverlay = {
      type: 'navigation',
      position: 'center',
      content: step.instruction,
      icon: this.getTurnIcon(step.turnType),
      duration: step.duration < 30 ? undefined : 8000, // Längere Anzeige für weitere Entfernungen
      priority: 'high'
    };

    this.showOverlay(overlay);

    // Zusätzliche visuelle Hinweise
    if (step.visualCue) {
      setTimeout(() => {
        this.showOverlay({
          type: 'information',
          position: 'bottom',
          content: step.visualCue!,
          icon: '👁️',
          duration: 3000,
          priority: 'medium'
        });
      }, 1000);
    }
  }

  /**
   * Zeigt das nächste Overlay aus der Queue
   */
  private displayNextOverlay(): void {
    if (this.overlayQueue.length === 0) return;

    const overlay = this.overlayQueue.shift()!;
    this.state.currentOverlay = overlay;

    // Auto-hide nach Duration
    if (overlay.duration) {
      setTimeout(() => {
        this.state.currentOverlay = undefined;
      }, overlay.duration);
    }

    logger.info('👁️ Displaying AR Overlay', 'MetaGlassesService', {
      content: overlay.content,
      position: overlay.position,
      type: overlay.type
    });
  }

  /**
   * Leert alle Overlays
   */
  private clearOverlays(): void {
    this.overlayQueue = [];
    this.state.currentOverlay = undefined;
  }

  /**
   * Versucht Reconnect bei Verbindungsverlust
   */
  private async attemptReconnect(): Promise<void> {
    logger.info('🔄 Attempting to reconnect to Meta Glasses...', 'MetaGlassesService');

    try {
      await this.simulateConnection();
      this.state.connected = true;
      this.state.lastSync = new Date();

      this.showOverlay({
        type: 'information',
        position: 'center',
        content: 'Verbindung wiederhergestellt',
        icon: '🔗',
        duration: 3000,
        priority: 'medium'
      });

    } catch (error) {
      logger.warn('Reconnection failed', 'MetaGlassesService', error);
    }
  }

  /**
   * Hilfsfunktionen
   */
  private calculateDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    const R = 6371; // Erdradius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Meter
  }

  private calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  private determineTurnType(bearing: number): ARNavigationStep['turnType'] {
    if (bearing >= 315 || bearing < 45) return 'straight';
    if (bearing >= 45 && bearing < 135) return 'right';
    if (bearing >= 135 && bearing < 225) return 'u_turn'; // 180° ungefähr
    if (bearing >= 225 && bearing < 315) return 'left';

    // Detailliertere Abstufungen
    if (bearing >= 10 && bearing < 45) return 'slight_right';
    if (bearing >= 45 && bearing < 80) return 'right';
    if (bearing >= 80 && bearing < 100) return 'sharp_right';

    if (bearing >= 260 && bearing < 315) return 'slight_left';
    if (bearing >= 225 && bearing < 260) return 'left';
    if (bearing >= 170 && bearing < 225) return 'sharp_left';

    return 'straight';
  }

  private generateNavigationInstruction(point: any, turnType: ARNavigationStep['turnType'], distance: number): string {
    const distanceText = distance < 1000 ?
      `${Math.round(distance)}m` :
      `${(distance / 1000).toFixed(1)}km`;

    switch (turnType) {
      case 'straight':
        return `Geradeaus weiter für ${distanceText} zu ${point.name}`;
      case 'left':
        return `Links abbiegen in ${distanceText} zu ${point.name}`;
      case 'right':
        return `Rechts abbiegen in ${distanceText} zu ${point.name}`;
      case 'slight_left':
        return `Leicht links in ${distanceText} zu ${point.name}`;
      case 'slight_right':
        return `Leicht rechts in ${distanceText} zu ${point.name}`;
      case 'sharp_left':
        return `Scharf links in ${distanceText} zu ${point.name}`;
      case 'sharp_right':
        return `Scharf rechts in ${distanceText} zu ${point.name}`;
      case 'u_turn':
        return `Wenden in ${distanceText} zu ${point.name}`;
      default:
        return `Weiter zu ${point.name}`;
    }
  }

  private getTurnIcon(turnType: ARNavigationStep['turnType']): string {
    switch (turnType) {
      case 'straight': return '⬆️';
      case 'left': return '⬅️';
      case 'right': return '➡️';
      case 'slight_left': return '↖️';
      case 'slight_right': return '↗️';
      case 'sharp_left': return '↙️';
      case 'sharp_right': return '↘️';
      case 'u_turn': return '🔄';
      default: return '⬆️';
    }
  }

  private findNearbyLandmarks(location: { lat: number; lng: number }): string[] {
    // Simuliere nahegelegene Orientierungspunkte
    const landmarks = [
      'Tankstelle', 'Supermarkt', 'Bank', 'Kirche', 'Schule', 'Park', 'Restaurant'
    ];

    return landmarks
      .filter(() => Math.random() > 0.7) // 30% Chance für jeden Landmark
      .slice(0, 2); // Max 2 Landmarks
  }

  /**
   * Synchronisiert AR-Daten mit dem Backend
   */
  async syncARData(driverId: string, data: { location?: any; batteryLevel?: number; temperature?: number; overlays?: any[] }): Promise<void> {
    try {
      const { DriverService } = await import('./driverService');
      await DriverService.syncARData(driverId, {
        location: data.location,
        batteryLevel: data.batteryLevel ?? this.state.batteryLevel,
        temperature: data.temperature ?? this.state.temperature,
        overlays: data.overlays || this.overlayQueue,
      });
      this.state.lastSync = new Date();
      logger.info('✅ AR data synced with backend', 'MetaGlassesService');
    } catch (error) {
      logger.error('❌ Failed to sync AR data', 'MetaGlassesService', error);
    }
  }

  /**
   * Aktualisiert den Batteriestatus
   */
  async updateBatteryLevel(driverId: string, batteryLevel: number): Promise<void> {
    this.state.batteryLevel = batteryLevel;
    try {
      const { DriverService } = await import('./driverService');
      await DriverService.updateMetaGlassesBattery(driverId, batteryLevel);
      logger.info(`✅ Battery level updated: ${batteryLevel}%`, 'MetaGlassesService');
    } catch (error) {
      logger.error('❌ Failed to update battery level', 'MetaGlassesService', error);
    }
  }

  /**
   * Lädt Geräte-Liste vom Backend
   */
  async getDevices(driverId: string): Promise<any[]> {
    try {
      const { DriverService } = await import('./driverService');
      const response = await DriverService.getMetaGlassesDevices(driverId);
      return response.devices || [];
    } catch (error) {
      logger.error('❌ Failed to get devices', 'MetaGlassesService', error);
      return [];
    }
  }

  /**
   * Sendet AR-Overlay an das Backend
   */
  async sendOverlayToBackend(driverId: string, overlay: AROverlay): Promise<void> {
    try {
      const { DriverService } = await import('./driverService');
      await DriverService.sendAROverlay(driverId, {
        type: overlay.type,
        content: overlay.content || '',
        position: overlay.position,
        duration: overlay.duration,
      });
      logger.info('✅ Overlay sent to backend', 'MetaGlassesService');
    } catch (error) {
      logger.error('❌ Failed to send overlay to backend', 'MetaGlassesService', error);
    }
  }

  private generateVisualCue(point: any): string {
    if (point.type === 'restaurant') {
      return `Achte auf ${point.name} mit dem Logo`;
    } else if (point.type === 'customer') {
      return 'Suche nach der Hausnummer und Klingel';
    }
    return '';
  }
}

// Export Singleton-Instanz
export const metaGlassesService = MetaGlassesService.getInstance();
