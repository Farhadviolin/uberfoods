import { AdvancedRoutingService } from '../advancedRoutingService';

describe('AdvancedRoutingService', () => {
  let service: AdvancedRoutingService;

  beforeEach(() => {
    service = new AdvancedRoutingService();
  });

  it('should optimize route for multiple orders', async () => {
    const orders = [
      {
        id: 'order-1',
        customer: { name: 'Customer 1' },
        restaurant: { location: { lat: 48.2082, lng: 16.3738 } },
        deliveryAddress: { location: { lat: 48.2100, lng: 16.3800 } },
      },
      {
        id: 'order-2',
        customer: { name: 'Customer 2' },
        restaurant: { location: { lat: 48.2150, lng: 16.3850 } },
        deliveryAddress: { location: { lat: 48.2200, lng: 16.3900 } },
      },
    ];

    const driverLocation = { lat: 48.2000, lng: 16.3700 };

    const result = await service.optimizeRoute(orders as any, driverLocation);

    expect(result).toHaveProperty('optimizedRoute');
    expect(result).toHaveProperty('efficiency');
    expect(result.efficiency).toBeGreaterThanOrEqual(0);
    expect(result.efficiency).toBeLessThanOrEqual(100);
  });

  it('should calculate distance between two points', () => {
    const point1 = { lat: 48.2082, lng: 16.3738 };
    const point2 = { lat: 48.2100, lng: 16.3800 };

    const distance = service.calculateDistance(point1, point2);

    expect(distance).toBeGreaterThan(0);
    expect(typeof distance).toBe('number');
  });
});

