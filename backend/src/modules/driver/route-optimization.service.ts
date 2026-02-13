import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  RouteOptimizationRequestDto,
  RouteOptimizationResponseDto,
  RouteOptionDto,
  WaypointDto,
} from "./dto/route-optimization.dto";

@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async optimizeRoute(
    driverId: string,
    request: RouteOptimizationRequestDto,
  ): Promise<RouteOptimizationResponseDto> {
    // For MVP, return mock optimization data
    return {
      routes: [
        {
          id: `route_${Date.now()}`,
          waypoints: request.orderIds.map((orderId, index) => ({
            orderId,
            sequence: index + 1,
            location: { lat: 0, lng: 0 },
            estimatedArrival: new Date(
              Date.now() + (index + 1) * 10 * 60 * 1000,
            ),
            priority: "normal" as const,
          })),
          totalDistance: 15.5,
          totalTime: 45,
          confidence: 0.85,
        },
      ],
      recommendedRoute: {
        id: `route_${Date.now()}`,
        waypoints: request.orderIds.map((orderId, index) => ({
          orderId,
          sequence: index + 1,
          location: { lat: 0, lng: 0 },
          estimatedArrival: new Date(Date.now() + (index + 1) * 10 * 60 * 1000),
          priority: "normal" as const,
        })),
        totalDistance: 15.5,
        totalTime: 45,
        confidence: 0.85,
      },
      optimization: {
        distanceSaved: 8.5,
        timeSaved: 12,
        costReduction: 5.2,
      },
    } as any;
  }

  async getActiveRoutes(driverId: string): Promise<RouteOptionDto[]> {
    // For MVP, return mock active routes
    return [
      {
        id: `active_route_${Date.now()}`,
        waypoints: [
          {
            orderId: "mock_order_1",
            sequence: 1,
            location: { lat: 40.7128, lng: -74.006 },
            estimatedArrival: new Date(Date.now() + 15 * 60 * 1000),
            priority: "normal" as const,
          },
        ],
        totalDistance: 8.5,
        totalTime: 25,
        confidence: 0.9,
      } as any,
    ];
  }

  private async generateRouteOptions(
    orders: any[],
    driver: any,
    request: RouteOptimizationRequestDto,
  ): Promise<RouteOptionDto[]> {
    // For MVP, return mock routes
    return [
      {
        id: `route_${Date.now()}`,
        waypoints: orders.map((order, index) => ({
          orderId: order.id || `order_${index}`,
          sequence: index + 1,
          location: { lat: 40.7128, lng: -74.006 },
          estimatedArrival: new Date(Date.now() + (index + 1) * 10 * 60 * 1000),
          priority: "normal" as const,
        })) as any,
        totalDistance: 12.5,
        totalTime: 35,
        confidence: 0.8,
      } as any,
    ];
  }

  private async createRestaurantFirstRoute(
    orders: any[],
    driver: any,
  ): Promise<RouteOptionDto> {
    // For MVP, return mock route
    return {
      id: "restaurant-first",
      waypoints: orders.map((order, index) => ({
        orderId: order.id || `order_${index}`,
        sequence: index + 1,
        location: { lat: 40.7128, lng: -74.006 },
        estimatedArrival: new Date(Date.now() + (index + 1) * 10 * 60 * 1000),
        priority: "normal" as const,
      })) as any,
      totalDistance: 12.5,
      totalTime: 35,
      confidence: 0.8,
    } as any;
  }

  private async createDistanceOptimizedRoute(
    orders: any[],
    driver: any,
  ): Promise<RouteOptionDto> {
    // Mock implementation - in real app, this would use a routing algorithm
    const waypoints: WaypointDto[] = [];

    // Simple distance-based sorting
    const sortedOrders = [...orders].sort((a, b) => {
      const distA = this.calculateDistance(
        driver.currentLocation,
        a.restaurant.location,
      );
      const distB = this.calculateDistance(
        driver.currentLocation,
        b.restaurant.location,
      );
      return distA - distB;
    });

    let currentLocation = driver.currentLocation;
    let totalDistance = 0;
    let totalDuration = 0;
    let estimatedEarnings = 0;

    for (const order of sortedOrders) {
      // Pickup
      const pickupWaypoint: WaypointDto = {
        id: `pickup-${order.id}`,
        type: "pickup",
        address: order.restaurant.address,
        coordinates: order.restaurant.location,
        orderId: order.id,
      };
      waypoints.push(pickupWaypoint);

      const pickupDistance = this.calculateDistance(
        currentLocation,
        order.restaurant.location,
      );
      totalDistance += pickupDistance;
      totalDuration += Math.round(pickupDistance * 3);
      currentLocation = order.restaurant.location;

      // Delivery
      const deliveryWaypoint: WaypointDto = {
        id: `delivery-${order.id}`,
        type: "delivery",
        address: order.deliveryAddress,
        coordinates: order.deliveryLocation,
        orderId: order.id,
      };
      waypoints.push(deliveryWaypoint);

      const deliveryDistance = this.calculateDistance(
        currentLocation,
        order.deliveryLocation,
      );
      totalDistance += deliveryDistance;
      totalDuration += Math.round(deliveryDistance * 3);

      currentLocation = order.deliveryLocation;
      estimatedEarnings += order.deliveryFee;
    }

    const fuelCost = totalDistance * 0.25;
    const efficiency = Math.min(100, 85 + Math.random() * 10);

    return {
      id: "distance-optimized",
      waypoints,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round(totalDuration),
      estimatedEarnings: Math.round(estimatedEarnings * 100) / 100,
      fuelCost: Math.round(fuelCost * 100) / 100,
      efficiency: Math.round(efficiency),
    };
  }

  private async createTimeOptimizedRoute(
    orders: any[],
    driver: any,
  ): Promise<RouteOptionDto> {
    // Mock implementation prioritizing time over distance
    const waypoints: WaypointDto[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let estimatedEarnings = 0;

    // Sort by estimated delivery time
    const sortedOrders = [...orders].sort((a, b) => {
      const timeA = a.estimatedDeliveryTime || 30;
      const timeB = b.estimatedDeliveryTime || 30;
      return timeA - timeB;
    });

    let currentLocation = driver.currentLocation;

    for (const order of sortedOrders) {
      // Direct delivery (skip pickup for time optimization)
      const deliveryWaypoint: WaypointDto = {
        id: `delivery-${order.id}`,
        type: "delivery",
        address: order.deliveryAddress,
        coordinates: order.deliveryLocation,
        orderId: order.id,
      };
      waypoints.push(deliveryWaypoint);

      const distance = this.calculateDistance(
        currentLocation,
        order.deliveryLocation,
      );
      totalDistance += distance;
      totalDuration += Math.round(distance * 2.5); // Faster travel time assumption
      currentLocation = order.deliveryLocation;
      estimatedEarnings += order.deliveryFee;
    }

    const fuelCost = totalDistance * 0.25;
    const efficiency = Math.min(100, 90 + Math.random() * 8);

    return {
      id: "time-optimized",
      waypoints,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round(totalDuration),
      estimatedEarnings: Math.round(estimatedEarnings * 100) / 100,
      fuelCost: Math.round(fuelCost * 100) / 100,
      efficiency: Math.round(efficiency),
    };
  }

  private selectBestRoute(routes: RouteOptionDto[]): RouteOptionDto {
    // Select route with highest efficiency score
    return routes.reduce((best, current) =>
      current.efficiency > best.efficiency ? current : best,
    );
  }

  private calculateOptimization(
    routes: RouteOptionDto[],
    recommended: RouteOptionDto,
  ) {
    const averageRoute = routes.reduce(
      (acc, route) => ({
        distance: acc.distance + route.totalDistance,
        duration: acc.duration + route.totalDuration,
        earnings: acc.earnings + route.estimatedEarnings,
      }),
      { distance: 0, duration: 0, earnings: 0 },
    );

    averageRoute.distance /= routes.length;
    averageRoute.duration /= routes.length;
    averageRoute.earnings /= routes.length;

    return {
      savedDistance: Math.max(
        0,
        averageRoute.distance - recommended.totalDistance,
      ),
      savedTime: Math.max(0, averageRoute.duration - recommended.totalDuration),
      increasedEarnings: Math.max(
        0,
        recommended.estimatedEarnings - averageRoute.earnings,
      ),
    };
  }

  private groupOrdersByRestaurant(orders: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const order of orders) {
      const restaurantId = order.restaurant.id;
      if (!groups.has(restaurantId)) {
        groups.set(restaurantId, []);
      }
      groups.get(restaurantId)!.push(order);
    }

    return groups;
  }

  private calculateDistance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) *
        Math.cos(this.toRadians(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
