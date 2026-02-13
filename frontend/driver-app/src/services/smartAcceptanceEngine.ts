import { Order, Driver, AcceptanceScore, TrafficData, DriverPerformance, RouteOptimization } from '../types';
import api from '../utils/api';
import { logger } from '../utils/logger';
import { getEnvVar } from '../utils/env';
import { isAxiosErrorResponse } from '../utils/errorHandler';

export class SmartAcceptanceEngine {
  private static instance: SmartAcceptanceEngine;

  public static getInstance(): SmartAcceptanceEngine {
    if (!SmartAcceptanceEngine.instance) {
      SmartAcceptanceEngine.instance = new SmartAcceptanceEngine();
    }
    return SmartAcceptanceEngine.instance;
  }

  /**
   * Hauptfunktion: Analysiert eine Bestellung und gibt eine KI-gestützte Empfehlung
   */
  async analyzeOrder(order: Order, driver: Driver, currentOrders: Order[] = [], driverLocation?: { lat: number; lng: number }): Promise<AcceptanceScore> {
    try {
      logger.info('🤖 Starte KI-Analyse für Bestellung', 'SmartAcceptanceEngine', { orderId: order.id });

      // Versuche Backend-API zu verwenden (PRIORITÄT)
      // Benötigter Backend-Endpoint: POST /drivers/{driverId}/acceptance/analyze
      if (driverLocation && driver.id) {
        try {
          const response = await api.post(`/drivers/${driver.id}/acceptance/analyze`, {
            orderId: order.id,
            location: driverLocation
          });
          
          logger.debug('KI-Analyse von Backend geladen', 'SmartAcceptanceEngine');

          // Konvertiere Backend-Response zu Frontend-Format
          const backendScore = response.data;
          return {
            orderId: order.id,
            overall: backendScore.overall,
            factors: {
              ...backendScore.factors,
              distance: backendScore.factors.time || 60 // Fallback: distance basierend auf time
            },
            recommendation: backendScore.recommendation,
            reasoning: backendScore.reasoning,
            estimatedEarnings: backendScore.estimatedEarnings,
            estimatedTime: backendScore.estimatedTime,
            confidence: this.calculateConfidence(backendScore.factors)
          };
        } catch (apiError: unknown) {
          // Backend-API nicht verfügbar - verwende lokale Berechnung
          if (isAxiosErrorResponse(apiError) && apiError.response?.status === 404) {
            logger.warn('KI-Analyse Endpoint nicht implementiert - verwende lokale Berechnung', 'SmartAcceptanceEngine');
          } else {
            logger.warn('Backend-API nicht verfügbar, verwende lokale Berechnung', 'SmartAcceptanceEngine', apiError);
          }
        }
      }

      // FALLBACK: Lokale Berechnung (nur wenn Backend nicht verfügbar)
      // WICHTIG: Lokale Berechnung ist weniger präzise als Backend-ML-Modelle!
      // Backend-Endpoint sollte implementiert werden für optimale KI-Analyse
      logger.debug('Verwende lokale KI-Analyse (Backend nicht verfügbar)', 'SmartAcceptanceEngine');
      // Parallele Berechnungen für bessere Performance
      const [
        trafficData,
        routeAnalysis,
        earningsPrediction,
        performanceMetrics
      ] = await Promise.all([
        this.getTrafficData(order),
        this.analyzeRouteComplexity(order, driver, currentOrders),
        this.predictEarnings(order, driver),
        this.getPerformanceMetrics(driver)
      ]);

      // KI-Scoring Algorithmus
      const factors = this.calculateFactors(order, driver, trafficData, routeAnalysis, earningsPrediction, performanceMetrics);

      // Gesamtscore berechnen (gewichtete Formel)
      const overall = this.calculateOverallScore(factors, driver);

      // Empfehlung generieren
      const recommendation = this.generateRecommendation(overall, factors, driver);

      // Begründung erstellen
      const reasoning = this.generateReasoning(factors, recommendation);

      const score: AcceptanceScore = {
        orderId: order.id,
        overall,
        factors,
        recommendation,
        reasoning,
        estimatedEarnings: earningsPrediction.amount,
        estimatedTime: routeAnalysis.estimatedTime,
        confidence: this.calculateConfidence(factors)
      };

      logger.info('✅ KI-Analyse abgeschlossen', 'SmartAcceptanceEngine', {
        orderId: order.id,
        score: overall,
        recommendation
      });

      return score;

    } catch (error) {
      logger.error('❌ Fehler bei KI-Analyse', 'SmartAcceptanceEngine', error);

      // Fallback: Basis-Score bei Fehlern
      return {
        orderId: order.id,
        overall: 60,
        factors: {
          traffic: 60,
          earnings: 60,
          time: 60,
          distance: 60,
          performance: 60,
          fatigue: 60
        },
        recommendation: 'wait',
        reasoning: ['Analyse fehlgeschlagen - warte auf bessere Daten'],
        estimatedEarnings: order.totalAmount * 0.8,
        estimatedTime: 30,
        confidence: 30
      };
    }
  }

  /**
   * Traffic-Daten abrufen
   * 
   * WICHTIG: Versucht zuerst echte Traffic-APIs zu verwenden.
   * Fallback zu simulierten Daten nur wenn APIs nicht verfügbar sind.
   */
  private async getTrafficData(order: Order): Promise<TrafficData> {
    // Versuche Google Maps API zu verwenden (wenn konfiguriert)
    const googleApiKey = getEnvVar('VITE_GOOGLE_MAPS_API_KEY');
    if (googleApiKey && order.restaurant.location && order.customerLocation) {
      try {
        const from = order.restaurant.location;
        const to = order.customerLocation;
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.lat},${from.lng}&destinations=${to.lat},${to.lng}&departure_time=now&traffic_model=best_guess&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.rows[0]?.elements[0]) {
          const element = data.rows[0].elements[0];
          const distanceKm = element.distance.value / 1000;
          const durationSeconds = element.duration_in_traffic?.value || element.duration.value;
          const durationMinutes = durationSeconds / 60;
          
          return {
            currentSpeed: (distanceKm / durationMinutes) * 60,
            averageSpeed: 35,
            congestionLevel: element.duration_in_traffic ? 
              Math.min(100, ((element.duration_in_traffic.value / element.duration.value - 1) * 100)) : 0,
            incidents: [],
            prediction15min: durationMinutes
          };
        }
      } catch (error) {
        logger.warn('Google Maps API nicht verfügbar für Traffic-Daten', 'SmartAcceptanceEngine', error);
      }
    }

    // FALLBACK: Simulierte Traffic-Daten (nur wenn keine API verfügbar)
    // WICHTIG: Diese Daten sind weniger präzise als echte Traffic-APIs!
    try {
      const baseTraffic = Math.random() * 100;
      const congestionMultiplier = Math.random() > 0.8 ? 2 : 1; // 20% Chance auf Stau

      return {
        currentSpeed: 40 - (baseTraffic * 0.3), // 40-10 km/h
        averageSpeed: 35,
        congestionLevel: baseTraffic * congestionMultiplier,
        incidents: [], // Könnte von zusätzlicher API kommen
        prediction15min: 15 + (baseTraffic * 0.3) // 15-45 Minuten
      };
    } catch (error) {
      logger.warn('Traffic-Daten nicht verfügbar', 'SmartAcceptanceEngine', error);
      return {
        currentSpeed: 30,
        averageSpeed: 30,
        congestionLevel: 50,
        incidents: [],
        prediction15min: 25
      };
    }
  }

  /**
   * Routen-Komplexität analysieren
   */
  private async analyzeRouteComplexity(order: Order, driver: Driver, currentOrders: Order[]) {
    const restaurantDistance = this.calculateDistance(
      driver.location || { lat: 48.2082, lng: 16.3738 },
      order.restaurant.location || order.restaurant.address // Fallback
    );

    const deliveryDistance = this.calculateDistance(
      order.restaurant.location || order.restaurant.address,
      order.customerLocation || order.address
    );

    const totalDistance = restaurantDistance + deliveryDistance;

    // Zusätzliche Bestellungen berücksichtigen
    const additionalTime = currentOrders.length * 5; // 5 Minuten pro aktive Bestellung

    return {
      restaurantDistance,
      deliveryDistance,
      totalDistance,
      estimatedTime: Math.round((totalDistance / 30) * 60 + additionalTime), // 30 km/h Durchschnitt
      complexity: currentOrders.length > 2 ? 'high' : currentOrders.length > 1 ? 'medium' : 'low'
    };
  }

  /**
   * Earnings-Vorhersage
   */
  private async predictEarnings(order: Order, driver: Driver) {
    const baseAmount = order.totalAmount;

    // Provision (typischerweise 20-30%)
    const commission = baseAmount * 0.25;

    // Bonusse für Distanz/Zeit
    const distanceBonus = Math.min(order.totalAmount * 0.1, 5); // Max 5€ für lange Strecken

    // Zeitbasierte Bonusse (Rush Hour)
    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 11 && currentHour <= 14) || (currentHour >= 18 && currentHour <= 21);
    const rushBonus = isRushHour ? baseAmount * 0.05 : 0;

    return {
      amount: baseAmount - commission + distanceBonus + rushBonus,
      commission,
      bonuses: distanceBonus + rushBonus,
      breakdown: {
        base: baseAmount,
        commission,
        distanceBonus,
        rushBonus
      }
    };
  }

  /**
   * Performance-Metriken laden
   * Hinweis: Diese Methode wird nur im lokalen Fallback verwendet.
   * Die Backend-API /drivers/:id/acceptance/analyze verwendet bereits alle Performance-Daten.
   */
  private async getPerformanceMetrics(driver: Driver): Promise<DriverPerformance> {
    // Fallback-Performance-Daten (wird nur verwendet, wenn Backend-API nicht verfügbar ist)
    // Die Backend-API /drivers/:id/acceptance/analyze holt bereits alle Performance-Daten
    return {
      rating: 4.5,
      totalDeliveries: 150,
      onTimePercentage: 95,
      customerSatisfaction: 4.7,
      averageEarnings: 25,
      fatigueLevel: Math.random() * 30, // 0-30 (nicht zu müde)
      todayStats: {
        deliveries: 8,
        earnings: 180,
        hoursWorked: 6
      }
    };
  }

  /**
   * Einzelne Faktoren berechnen (0-100)
   */
  private calculateFactors(order: Order, driver: Driver, traffic: TrafficData, route: any, earnings: any, performance: DriverPerformance) {
    return {
      traffic: Math.max(0, 100 - traffic.congestionLevel),
      earnings: Math.min(100, (earnings.amount / 10) * 100), // Skaliere auf 0-100
      time: Math.max(0, 100 - (route.estimatedTime / 60) * 100), // Kürzere Zeit = besser
      distance: Math.max(0, 100 - (route.totalDistance / 20) * 100), // Kürzere Distanz = besser
      performance: performance.rating * 20, // 5.0 = 100, 0 = 0
      fatigue: Math.max(0, 100 - performance.fatigueLevel)
    };
  }

  /**
   * Gesamtscore mit Gewichtung berechnen
   */
  private calculateOverallScore(factors: any, driver: Driver): number {
    const weights = {
      traffic: 0.25,      // 25% - sehr wichtig bei Stau
      earnings: 0.20,     // 20% - finanzielle Motivation
      time: 0.20,         // 20% - Zeitmanagement
      distance: 0.15,     // 15% - Kraftstoff/Effizienz
      performance: 0.10,  // 10% - persönliche Performance
      fatigue: 0.10       // 10% - Gesundheit/Sicherheit
    };

    let score = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      score += factors[factor] * weight;
    }

    return Math.round(score);
  }

  /**
   * Empfehlung basierend auf Score und Driver-Präferenzen
   */
  private generateRecommendation(score: number, factors: any, driver: Driver): AcceptanceScore['recommendation'] {
    const preferences = driver.preferences;
    const autoAcceptThreshold = preferences?.autoAcceptThreshold || 85;

    // Auto-Accept bei sehr guten Bedingungen
    if (score >= autoAcceptThreshold && factors.fatigue > 70 && factors.traffic > 60) {
      return 'auto_accept';
    }

    // Ablehnen bei schlechten Bedingungen
    if (score < 40 || factors.fatigue < 30) {
      return 'decline';
    }

    // Warten bei mittleren Scores oder hohem Traffic
    if (score < 70 || factors.traffic < 50) {
      return 'wait';
    }

    return 'accept';
  }

  /**
   * KI-Begründung generieren
   */
  private generateReasoning(factors: any, recommendation: string): string[] {
    const reasons: string[] = [];

    if (recommendation === 'auto_accept') {
      reasons.push('⭐ Ausgezeichnete Bedingungen - automatische Annahme empfohlen');
    }

    if (factors.traffic > 80) {
      reasons.push('🚦 Gute Verkehrslage');
    } else if (factors.traffic < 40) {
      reasons.push('🚦 Hoher Verkehr - längere Fahrtzeit erwartet');
    }

    if (factors.earnings > 80) {
      reasons.push('💰 Sehr gutes Verdienstpotenzial');
    }

    if (factors.fatigue > 80) {
      reasons.push('⚡ Gute Kondition - bereit für weitere Bestellungen');
    } else if (factors.fatigue < 50) {
      reasons.push('😴 Hohe Ermüdung - Pause empfohlen');
    }

    if (factors.time > 80) {
      reasons.push('⏱️ Schnelle Lieferung möglich');
    }

    return reasons.length > 0 ? reasons : ['⚖️ Ausgewogene Entscheidung'];
  }

  /**
   * Konfidenz der Vorhersage berechnen
   */
  private calculateConfidence(factors: any): number {
    // Hohe Konfidenz wenn alle Faktoren konsistent sind
    const variance = Object.values(factors).reduce((acc: number, val: number) => {
      return acc + Math.pow(val - 60, 2); // Abweichung vom Mittelwert
    }, 0) / Object.keys(factors).length;

    return Math.max(20, Math.min(95, 100 - Math.sqrt(variance)));
  }

  /**
   * Hilfsfunktion: Distanz zwischen zwei Punkten berechnen
   */
  private calculateDistance(point1: any, point2: any): number {
    // Vereinfachte Haversine-Formel für Demo
    // In Produktion würde Google Maps Distance Matrix verwendet werden
    const R = 6371; // Erdradius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Export Singleton-Instanz
export const smartAcceptanceEngine = SmartAcceptanceEngine.getInstance();
