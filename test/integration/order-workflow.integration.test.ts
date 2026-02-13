import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../backend/src/app.module';

describe('Order Workflow (Integration)', () => {
  let app: INestApplication;
  let customerToken: string;
  let restaurantToken: string;
  let driverToken: string;
  let testOrderId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Login as customer
    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'customer@test.com',
        password: 'CustomerPass123!',
      });
    customerToken = customerLogin.body.accessToken;

    // Login as restaurant
    const restaurantLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'restaurant@test.com',
        password: 'RestaurantPass123!',
      });
    restaurantToken = restaurantLogin.body.accessToken;

    // Login as driver
    const driverLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'driver@test.com',
        password: 'DriverPass123!',
      });
    driverToken = driverLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('complete order workflow from creation to delivery', async () => {
    // Step 1: Customer creates order
    const createOrderResponse = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        restaurantId: 'rest_test',
        items: [
          { dishId: 'dish_test', quantity: 2 },
        ],
        deliveryAddress: {
          street: 'Teststrasse 1',
          city: 'Wien',
          zipCode: '1010',
        },
      })
      .expect(201);

    testOrderId = createOrderResponse.body.id;
    expect(createOrderResponse.body.status).toBe('PENDING');

    // Step 2: Restaurant confirms order
    const confirmResponse = await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(200);

    expect(confirmResponse.body.status).toBe('CONFIRMED');

    // Step 3: Restaurant marks as preparing
    await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'PREPARING' })
      .expect(200);

    // Step 4: Restaurant marks as ready
    await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'READY' })
      .expect(200);

    // Step 5: Driver accepts order
    const assignResponse = await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/assign`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ driverId: 'driver_test' })
      .expect(200);

    expect(assignResponse.body.status).toBe('ASSIGNED');

    // Step 6: Driver picks up order
    await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'PICKED_UP' })
      .expect(200);

    // Step 7: Driver marks as in transit
    await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'IN_TRANSIT' })
      .expect(200);

    // Step 8: Driver delivers order
    const deliverResponse = await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'DELIVERED' })
      .expect(200);

    expect(deliverResponse.body.status).toBe('DELIVERED');

    // Step 9: Customer can view completed order
    const orderResponse = await request(app.getHttpServer())
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(orderResponse.body.status).toBe('DELIVERED');
  });

  it('should handle order cancellation', async () => {
    // Create order
    const createResponse = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        restaurantId: 'rest_test',
        items: [{ dishId: 'dish_test', quantity: 1 }],
      })
      .expect(201);

    const orderId = createResponse.body.id;

    // Cancel order
    await request(app.getHttpServer())
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CANCELLED', reason: 'Changed mind' })
      .expect(200);

    // Verify cancelled
    const orderResponse = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(orderResponse.body.status).toBe('CANCELLED');
  });

  it('should enforce authorization for status changes', async () => {
    // Customer tries to mark order as preparing (only restaurant can)
    await request(app.getHttpServer())
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'PREPARING' })
      .expect(403);
  });
});
