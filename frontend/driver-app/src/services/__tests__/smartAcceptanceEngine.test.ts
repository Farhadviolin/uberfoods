import { SmartAcceptanceEngine } from '../smartAcceptanceEngine';

describe('SmartAcceptanceEngine', () => {
  let engine: SmartAcceptanceEngine;

  beforeEach(() => {
    engine = new SmartAcceptanceEngine();
  });

  it('should analyze order and return score', async () => {
    const order = {
      id: 'order-123',
      totalAmount: 25.50,
      estimatedDeliveryTime: 30,
    };

    const driver = {
      id: 'driver-123',
      location: { lat: 48.2082, lng: 16.3738 },
    };

    const result = await engine.analyzeOrder(order as any, driver as any, {
      lat: 48.2082,
      lng: 16.3738,
    });

    expect(result).toHaveProperty('overall');
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('should return recommendation based on score', async () => {
    const order = {
      id: 'order-123',
      totalAmount: 50.00,
      estimatedDeliveryTime: 15,
    };

    const driver = {
      id: 'driver-123',
      location: { lat: 48.2082, lng: 16.3738 },
    };

    const result = await engine.analyzeOrder(order as any, driver as any, {
      lat: 48.2082,
      lng: 16.3738,
    });

    expect(result).toHaveProperty('recommendation');
    expect(['accept', 'wait', 'decline', 'auto_accept']).toContain(result.recommendation);
  });
});

