import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../backend/src/app.module';

describe('Payment Flow (Integration)', () => {
  let app: INestApplication;
  let customerToken: string;
  let testOrderId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Login and create test order
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'customer@test.com',
        password: 'CustomerPass123!',
      });

    customerToken = loginResponse.body.accessToken;

    const orderResponse = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        restaurantId: 'rest_test',
        items: [{ dishId: 'dish_test', quantity: 2 }],
        totalAmount: 25.50,
      });

    testOrderId = orderResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Stripe Payment Flow', () => {
    it('should create payment intent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          amount: 25.50,
          currency: 'eur',
        })
        .expect(201);

      expect(response.body.clientSecret).toBeDefined();
      expect(response.body.paymentIntentId).toBeDefined();
    });

    it('should validate payment amount', async () => {
      await request(app.getHttpServer())
        .post('/api/payment/intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          amount: 0, // Invalid
          currency: 'eur',
        })
        .expect(400);
    });

    it('should confirm payment', async () => {
      // Create intent first
      const intentResponse = await request(app.getHttpServer())
        .post('/api/payment/intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          amount: 25.50,
          currency: 'eur',
        });

      const paymentIntentId = intentResponse.body.paymentIntentId;

      // Confirm payment
      const response = await request(app.getHttpServer())
        .post('/api/payment/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentIntentId,
          orderId: testOrderId,
        })
        .expect(200);

      expect(response.body.status).toBe('SUCCEEDED');
    });
  });

  describe('PayPal Payment Flow', () => {
    it('should create PayPal order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/paypal/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          amount: 25.50,
          currency: 'EUR',
        })
        .expect(201);

      expect(response.body.paypalOrderId).toBeDefined();
      expect(response.body.approvalUrl).toBeDefined();
    });

    it('should capture PayPal payment', async () => {
      // Create PayPal order first
      const createResponse = await request(app.getHttpServer())
        .post('/api/payment/paypal/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          amount: 25.50,
          currency: 'EUR',
        });

      const paypalOrderId = createResponse.body.paypalOrderId;

      // Capture payment
      const response = await request(app.getHttpServer())
        .post('/api/payment/paypal/capture')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paypalOrderId,
          orderId: testOrderId,
        })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });
  });

  describe('Refund Flow', () => {
    it('should process refund', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/refund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          amount: 25.50,
          reason: 'Customer request',
        })
        .expect(200);

      expect(response.body.status).toBe('REFUNDED');
    });

    it('should validate refund amount', async () => {
      await request(app.getHttpServer())
        .post('/api/payment/refund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrderId,
          amount: 1000, // More than order total
          reason: 'Test',
        })
        .expect(400);
    });
  });

  describe('Payment Webhooks', () => {
    it('should handle Stripe webhook', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test',
            amount: 2550,
            status: 'succeeded',
          },
        },
      };

      await request(app.getHttpServer())
        .post('/api/payment/webhook')
        .send(webhookPayload)
        .expect(200);
    });
  });
});
