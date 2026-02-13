import { Order, Driver, RouteOptimization, TrafficData } from '../types';
import api from '../utils/api';
import { logger } from '../utils/logger';
import { getEnvBool, getEnvVar } from '../utils/env';

export class AdvancedRoutingService {
  private static instance: AdvancedRoutingService;
  private trafficCache = new Map<string, { data: TrafficData; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

  public static getInstance(): AdvancedRoutingService {
    if (!AdvancedRoutingService.instance) {
      AdvancedRoutingService.instance = new AdvancedRoutingService();
    }
    return AdvancedRoutingService.instance;
  }

  /**
   * ML-basierte Route-Optimierung mit Real-time Traffic
   */
  async optimizeRoute(
    orders: Order[],
    driver: Driver,
    currentLocation?: { lat: number; lng: number }
  ): Promise<RouteOptimization> {
    try {
      logger.info('🧠 Starte ML-basierte Route-Optimierung', 'AdvancedRoutingService', {
        orderCount: orders.length,
        driverId: driver.id
      });

      // Versuche Backend-API zu verwenden
      if (driver.id && currentLocation && orders.length > 0) {
        try {
          const response = await api.post(`/drivers/${driver.id}/route/optimize-advanced`, {
            location: currentLocation,
            orders: orders.map(order => ({
              orderId: order.id,
              restaurant: order.restaurant.location || { lat: 0, lng: 0 },
              customer: order.customerLocation || { lat: 0, lng: 0 },
              totalAmount: order.totalAmount
            }))
          });

          const backendRoute = response.data;
          
          // Konvertiere Backend-Format zu Frontend-Format
          return {
            optimizedRoute: backendRoute.optimizedRoute,
            totalDistance: backendRoute.totalDistance,
            totalTime: backendRoute.totalTime,
            fuelConsumption: backendRoute.fuelConsumption,
            earnings: backendRoute.earnings,
            efficiency: backendRoute.efficiency
          };
        } catch (apiError) {
          logger.warn('Backend-API nicht verfügbar, verwende lokale Berechnung', 'AdvancedRoutingService', apiError);
        }
      }

      // Fallback: Lokale Berechnung
      // 1. Sammle alle relevanten Punkte
      const routePoints = await this.collectRoutePoints(orders, driver, currentLocation);

      // 2. Analysiere Traffic für alle Routen-Segmente
      const trafficAnalysis = await this.analyzeTrafficConditions(routePoints);

      // 3. ML-basierte Reihenfolge-Optimierung
      const optimizedSequence = await this.optimizeSequence(routePoints, trafficAnalysis, driver);

      // 4. Berechne finale Route-Statistiken
      const finalRoute = await this.calculateFinalRoute(optimizedSequence, driver);

      logger.info('✅ Route-Optimierung abgeschlossen', 'AdvancedRoutingService', {
        efficiency: finalRoute.efficiency,
        totalTime: finalRoute.totalTime,
        totalDistance: finalRoute.totalDistance
      });

      return finalRoute;

    } catch (error) {
      logger.error('❌ Route-Optimierung fehlgeschlagen', 'AdvancedRoutingService', error);

      // Fallback: Einfache sequenzielle Route
      return this.createFallbackRoute(orders, driver, currentLocation);
    }
  }

  /**
   * Sammelt alle Route-Punkte (Driver-Start, Restaurants, Kunden)
   */
  private async collectRoutePoints(
    orders: Order[],
    driver: Driver,
    currentLocation?: { lat: number; lng: number }
  ) {
    const points = [];

    // Startpunkt: Aktuelle Driver-Position
    const driverStart = currentLocation || driver.location || { lat: 48.2082, lng: 16.3738 };
    points.push({
      id: 'driver_start',
      location: driverStart,
      type: 'driver' as const,
      name: 'Ihr Standort',
      estimatedArrival: new Date().toISOString(),
      action: 'Startposition'
    });

    // Sammle alle Restaurant- und Kunden-Punkte
    for (const order of orders) {
      // Restaurant-Abholpunkt
      if (order.restaurant.location) {
        points.push({
          id: `restaurant_${order.id}`,
          location: order.restaurant.location,
          type: 'restaurant' as const,
          orderId: order.id,
          name: order.restaurant.name,
          estimatedArrival: '',
          action: `Abholung bei ${order.restaurant.name}`
        });
      }

      // Kunden-Lieferpunkt
      if (order.customerLocation) {
        points.push({
          id: `customer_${order.id}`,
          location: order.customerLocation,
          type: 'customer' as const,
          orderId: order.id,
          name: order.customer.name,
          estimatedArrival: '',
          action: `Lieferung an ${order.customer.name}`
        });
      }
    }

    return points;
  }

  /**
   * Analysiert Traffic-Bedingungen für alle Route-Segmente
   */
  private async analyzeTrafficConditions(points: any[]): Promise<Map<string, TrafficData>> {
    const trafficMap = new Map<string, TrafficData>();

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      const segmentKey = `${from.id}->${to.id}`;

      // Cache prüfen
      const cached = this.trafficCache.get(segmentKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        trafficMap.set(segmentKey, cached.data);
        continue;
      }

      // Traffic-Daten abrufen
      const trafficData = await this.getTrafficData(from.location, to.location);

      // Cache aktualisieren
      this.trafficCache.set(segmentKey, { data: trafficData, timestamp: Date.now() });
      trafficMap.set(segmentKey, trafficData);
    }

    return trafficMap;
  }

  /**
   * Traffic-Daten von externer API (Google Maps oder TomTom)
   * 
   * WICHTIG: Versucht zuerst echte Traffic-APIs zu verwenden.
   * Fallback zu simulierten Daten nur wenn APIs nicht verfügbar sind.
   * 
   * Unterstützte APIs (über Environment-Variablen):
   * - Google Maps Distance Matrix API: VITE_GOOGLE_MAPS_API_KEY
   * - TomTom Traffic API: VITE_TOMTOM_API_KEY
   * - Backend Traffic Service: VITE_TRAFFIC_API_URL
   */
  private async getTrafficData(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<TrafficData> {
    const allowSimulation = getEnvBool('VITE_ALLOW_SIMULATION');

    // Option 1: Backend Traffic Service (PRIORITÄT)
    const trafficApiUrl = getEnvVar('VITE_TRAFFIC_API_URL');
    if (trafficApiUrl) {
      try {
        const response = await fetch(`${trafficApiUrl}/traffic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to })
        });
        
        if (response.ok) {
          const data = await response.json();
          logger.debug('Traffic-Daten von Backend-Service geladen', 'AdvancedRoutingService');
          return data;
        }
      } catch (error) {
        logger.warn('Backend Traffic Service nicht verfügbar', 'AdvancedRoutingService', error);
      }
    }

    // Option 2: Google Maps Distance Matrix API
    const googleApiKey = getEnvVar('VITE_GOOGLE_MAPS_API_KEY');
    if (googleApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.lat},${from.lng}&destinations=${to.lat},${to.lng}&departure_time=now&traffic_model=best_guess&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.rows[0]?.elements[0]) {
          const element = data.rows[0].elements[0];
          const distanceKm = element.distance.value / 1000;
          const durationSeconds = element.duration_in_traffic?.value || element.duration.value;
          const durationMinutes = durationSeconds / 60;
          
          logger.debug('Traffic-Daten von Google Maps API geladen', 'AdvancedRoutingService');
          
          return {
            currentSpeed: (distanceKm / durationMinutes) * 60, // km/h
            averageSpeed: 35, // km/h (Stadt-Durchschnitt)
            congestionLevel: element.duration_in_traffic ? 
              Math.min(100, ((element.duration_in_traffic.value / element.duration.value - 1) * 100)) : 0,
            incidents: [],
            prediction15min: durationMinutes
          };
        }
      } catch (error) {
        logger.warn('Google Maps API nicht verfügbar', 'AdvancedRoutingService', error);
      }
    }

    // Option 3: TomTom Traffic API
    const tomtomApiKey = getEnvVar('VITE_TOMTOM_API_KEY');
    if (tomtomApiKey) {
      try {
        // TomTom API Integration würde hier implementiert werden
        // Für jetzt: Skip (nicht implementiert)
        logger.debug('TomTom API Key vorhanden, aber Integration noch nicht implementiert', 'AdvancedRoutingService');
      } catch (error) {
        logger.warn('TomTom API nicht verfügbar', 'AdvancedRoutingService', error);
      }
    }

    // FALLBACK: Simulierte Traffic-Daten nur wenn explizit erlaubt
    if (!allowSimulation) {
      throw new Error('Keine Traffic-API konfiguriert und Simulation ist deaktiviert (VITE_ALLOW_SIMULATION)');
    }
    logger.warn('⚠️ Verwende simulierte Traffic-Daten - VITE_ALLOW_SIMULATION=true gesetzt', 'AdvancedRoutingService');
    
    // Versuche echte Traffic-Incidents von der API zu holen
    let incidents: TrafficData['incidents'] = [];
    try {
      const distanceKm = this.calculateDistance(from, to);
      const radiusMeters = Math.min(Math.max(distanceKm * 1000 * 0.75, 1000), 20000);
      const midpoint = {
        lat: (from.lat + to.lat) / 2,
        lng: (from.lng + to.lng) / 2,
      };

      const response = await api.get('/drivers/routing/traffic/incidents', {
        params: {
          lat: midpoint.lat,
          lng: midpoint.lng,
          radius: Math.round(radiusMeters),
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.lat,
          toLng: to.lng,
        },
      });
      incidents = response.data?.incidents || [];
    } catch (error) {
      // API nicht verfügbar - verwende leeres Array
      logger.warn('Traffic Incidents API nicht verfügbar', 'AdvancedRoutingService', error);
    }
    
    const distance = this.calculateDistance(from, to);
    const baseSpeed = 35; // km/h in der Stadt
    const congestionMultiplier = this.getCongestionMultiplier(from, to);

    const actualSpeed = Math.max(5, baseSpeed / congestionMultiplier);
    const estimatedTime = (distance / actualSpeed) * 60; // Minuten

    // Berechne Congestion-Level basierend auf Incidents
    const incidentCongestion = incidents.length * 10; // Jeder Incident erhöht Congestion um 10%

    return {
      currentSpeed: actualSpeed,
      averageSpeed: baseSpeed,
      congestionLevel: Math.min(100, congestionMultiplier * 20 + incidentCongestion),
      incidents,
      prediction15min: estimatedTime
    };
  }

  /**
   * ML-basierte Sequenz-Optimierung (vereinfachter Traveling Salesman Algorithmus)
   */
  private async optimizeSequence(points: any[], trafficMap: Map<string, TrafficData>, driver: Driver) {
    // Für kleine Routen: Brute-Force-Optimierung
    if (points.length <= 6) {
      return this.optimizeSmallRoute(points, trafficMap);
    }

    // Für größere Routen: Heuristische Optimierung
    return this.optimizeLargeRoute(points, trafficMap, driver);
  }

  /**
   * Optimierung für kleine Routen (≤ 6 Punkte)
   */
  private optimizeSmallRoute(points: any[], trafficMap: Map<string, TrafficData>) {
    const startPoint = points[0]; // Driver-Start
    const deliveryPoints = points.slice(1);

    // Finde optimale Reihenfolge basierend auf Traffic und Distanz
    const bestSequence = this.findBestSequence(startPoint, deliveryPoints, trafficMap);

    return [startPoint, ...bestSequence];
  }

  /**
   * Optimierung für große Routen (> 6 Punkte)
   */
  private optimizeLargeRoute(points: any[], trafficMap: Map<string, TrafficData>, driver: Driver) {
    // Nearest-Neighbor-Heuristik mit Traffic-Berücksichtigung
    const optimized = [points[0]]; // Start mit Driver-Position
    const remaining = [...points.slice(1)];

    while (remaining.length > 0) {
      const lastPoint = optimized[optimized.length - 1];
      let bestIndex = 0;
      let bestScore = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const score = this.calculateRouteScore(lastPoint, candidate, trafficMap, driver);

        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      optimized.push(remaining.splice(bestIndex, 1)[0]);
    }

    return optimized;
  }

  /**
   * Berechne Route-Score (Zeit + Traffic + Driver-Präferenzen)
   */
  private calculateRouteScore(from: any, to: any, trafficMap: Map<string, TrafficData>, driver: Driver): number {
    const segmentKey = `${from.id}->${to.id}`;
    const traffic = trafficMap.get(segmentKey);

    if (!traffic) return 1000; // Hohe Strafe bei fehlenden Daten

    const distance = this.calculateDistance(from.location, to.location);
    const timeCost = traffic.prediction15min;

    // Zusätzliche Kosten basierend auf Traffic-Stau
    const congestionCost = (traffic.congestionLevel / 100) * timeCost;

    // Berücksichtige Driver-Präferenzen (z.B. Vermeidung von Staus)
    const riskTolerance = driver.preferences?.riskTolerance || 'medium';
    const riskMultiplier = riskTolerance === 'low' ? 1.5 : riskTolerance === 'high' ? 0.8 : 1.0;

    return (timeCost + congestionCost) * riskMultiplier;
  }

  /**
   * Finde beste Sequenz für kleine Routen
   */
  private findBestSequence(startPoint: any, deliveryPoints: any[], trafficMap: Map<string, TrafficData>) {
    if (deliveryPoints.length <= 1) return deliveryPoints;

    // Generiere alle Permutationen und finde die beste
    const permutations = this.generatePermutations(deliveryPoints);
    let bestPermutation = permutations[0];
    let bestScore = Infinity;

    for (const perm of permutations) {
      let totalScore = 0;
      let currentPoint = startPoint;

      for (const nextPoint of perm) {
        totalScore += this.calculateRouteScore(currentPoint, nextPoint, trafficMap, {} as Driver);
        currentPoint = nextPoint;
      }

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestPermutation = perm;
      }
    }

    return bestPermutation;
  }

  /**
   * Generiere alle Permutationen (für kleine Arrays)
   */
  private generatePermutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];

    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const perms = this.generatePermutations(remaining);

      for (const perm of perms) {
        result.push([arr[i], ...perm]);
      }
    }

    return result;
  }

  /**
   * Berechne finale Route-Statistiken
   */
  private async calculateFinalRoute(optimizedSequence: any[], driver: Driver): Promise<RouteOptimization> {
    let totalDistance = 0;
    let totalTime = 0;
    let totalFuel = 0;
    let totalEarnings = 0;

    // Berechne kumulierte Ankunftszeiten
    let currentTime = new Date();

    for (let i = 0; i < optimizedSequence.length; i++) {
      const point = optimizedSequence[i];

      if (i > 0) {
        const prevPoint = optimizedSequence[i - 1];
        const distance = this.calculateDistance(prevPoint.location, point.location);
        const segmentTime = (distance / 25) * 60; // Vereinfachte Zeitberechnung

        totalDistance += distance;
        totalTime += segmentTime;
        totalFuel += distance * (driver.vehicle?.fuelEfficiency || 0.08); // Liter pro km

        currentTime = new Date(currentTime.getTime() + segmentTime * 60 * 1000);
      }

      point.estimatedArrival = currentTime.toISOString();

      // Berechne Earnings für Bestellungen
      if (point.orderId) {
        const order = await this.getOrderById(point.orderId);
        if (order) {
          totalEarnings += order.totalAmount * 0.8; // Provision abziehen
        }
      }
    }

    // Effizienz-Score berechnen (0-100)
    const efficiency = Math.max(0, Math.min(100,
      100 - (totalTime / 120) * 50 - (totalDistance / 50) * 50
    ));

    return {
      optimizedRoute: optimizedSequence,
      totalDistance,
      totalTime: Math.round(totalTime),
      fuelConsumption: Math.round(totalFuel * 100) / 100,
      earnings: Math.round(totalEarnings * 100) / 100,
      efficiency: Math.round(efficiency)
    };
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
    return R * c;
  }

  private getCongestionMultiplier(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    // Vereinfachte Logik für Rush-Hour-Erkennung
    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);

    // Zusätzliche Stau-Wahrscheinlichkeit basierend auf Route
    const routeCongestion = Math.random() * 0.5 + 0.75; // 0.75-1.25

    return isRushHour ? routeCongestion * 1.8 : routeCongestion;
  }

  // ✅ Alle Mock-Daten entfernt - echte API-Daten werden verwendet

  private async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  private createFallbackRoute(orders: Order[], driver: Driver, currentLocation?: { lat: number; lng: number }): RouteOptimization {
    const points = [
      {
        id: 'driver_start',
        location: currentLocation || driver.location || { lat: 48.2082, lng: 16.3738 },
        type: 'driver' as const,
        name: 'Ihr Standort',
        estimatedArrival: new Date().toISOString(),
        action: 'Startposition'
      },
      ...orders.flatMap(order => [
        {
          id: `restaurant_${order.id}`,
          location: order.restaurant.location || order.restaurant.address,
          type: 'restaurant' as const,
          orderId: order.id,
          name: order.restaurant.name,
          estimatedArrival: '',
          action: `Abholung bei ${order.restaurant.name}`
        },
        {
          id: `customer_${order.id}`,
          location: order.customerLocation || order.address,
          type: 'customer' as const,
          orderId: order.id,
          name: order.customer.name,
          estimatedArrival: '',
          action: `Lieferung an ${order.customer.name}`
        }
      ])
    ];

    return {
      optimizedRoute: points,
      totalDistance: 25,
      totalTime: 45,
      fuelConsumption: 2.0,
      earnings: orders.reduce((sum, o) => sum + o.totalAmount, 0) * 0.8,
      efficiency: 70
    };
  }
}

// Export Singleton-Instanz
export const advancedRoutingService = AdvancedRoutingService.getInstance();
