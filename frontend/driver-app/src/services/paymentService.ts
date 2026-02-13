import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { logger } from '../utils/logger';

interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'sepa_debit' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

interface PayoutData {
  amount: number;
  currency: string;
  description?: string;
  destination?: string;
}

export class PaymentService {
  private static instance: PaymentService;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async initialize(stripePublishableKey: string): Promise<void> {
    try {
      this.stripe = await loadStripe(stripePublishableKey);
      logger.info('Stripe initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'EUR', metadata?: any): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Payment intent creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  async confirmPayment(clientSecret: string, paymentMethod?: any): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod,
      });

      if (result.error) {
        throw result.error;
      }

      return result.paymentIntent;
    } catch (error) {
      logger.error('Payment confirmation failed:', error);
      throw error;
    }
  }

  async createPaymentMethod(cardElement: StripeCardElement, billingDetails?: any): Promise<PaymentMethod> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await this.stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: billingDetails,
      });

      if (result.error) {
        throw result.error;
      }

      return {
        id: result.paymentMethod.id,
        type: 'card',
        last4: result.paymentMethod.card?.last4,
        brand: result.paymentMethod.card?.brand,
        expiryMonth: result.paymentMethod.card?.exp_month,
        expiryYear: result.paymentMethod.card?.exp_year,
      };
    } catch (error) {
      logger.error('Failed to create payment method:', error);
      throw error;
    }
  }

  async attachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await fetch(`/api/payments/methods/${paymentMethodId}/attach`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to attach payment method: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to attach payment method:', error);
      throw error;
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await fetch(`/api/payments/methods/${paymentMethodId}/detach`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to detach payment method: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to detach payment method:', error);
      throw error;
    }
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await fetch('/api/payments/methods', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get payment methods: ${response.statusText}`);
      }

      const data = await response.json();
      return data.methods || [];
    } catch (error) {
      logger.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  async requestPayout(payoutData: PayoutData): Promise<any> {
    try {
      const response = await fetch('/api/drivers/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
        },
        body: JSON.stringify(payoutData),
      });

      if (!response.ok) {
        throw new Error(`Payout request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Failed to request payout:', error);
      throw error;
    }
  }

  async getPayoutHistory(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const response = await fetch(`/api/drivers/payouts/history?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get payout history: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Failed to get payout history:', error);
      throw error;
    }
  }

  async getBalance(): Promise<any> {
    try {
      const response = await fetch('/api/drivers/financial/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get balance: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw error;
    }
  }

  // Stripe Elements helpers
  createCardElement(options?: any): StripeCardElement | null {
    if (!this.stripe) {
      logger.error('Stripe not initialized');
      return null;
    }

    if (!this.elements) {
      this.elements = this.stripe.elements();
    }

    return this.elements.create('card', options);
  }

  mountCardElement(element: StripeCardElement, domElement: string | HTMLElement): void {
    element.mount(domElement);
  }

  unmountCardElement(element: StripeCardElement): void {
    element.unmount();
  }

  // Webhook handling (for backend)
  static async handleWebhook(rawBody: Buffer, signature: string, webhookSecret: string): Promise<any> {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      logger.error('Webhook signature verification failed:', err);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      case 'payout.created':
        await this.handlePayoutCreated(event.data.object);
        break;
      case 'payout.failed':
        await this.handlePayoutFailed(event.data.object);
        break;
      default:
        logger.warn(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private static async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    // Update order payment status
    await this.updateOrderPaymentStatus(paymentIntent.metadata.orderId, 'COMPLETED', paymentIntent.id);
    logger.info(`Payment succeeded for order: ${paymentIntent.metadata.orderId}`);
  }

  private static async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    // Update order payment status
    await this.updateOrderPaymentStatus(paymentIntent.metadata.orderId, 'FAILED', paymentIntent.id);
    logger.warn(`Payment failed for order: ${paymentIntent.metadata.orderId}`);
  }

  private static async handlePayoutCreated(payout: any): Promise<void> {
    // Update payout status
    await this.updatePayoutStatus(payout.id, 'PROCESSING');
    logger.info(`Payout created: ${payout.id}`);
  }

  private static async handlePayoutFailed(payout: any): Promise<void> {
    // Update payout status
    await this.updatePayoutStatus(payout.id, 'FAILED');
    logger.warn(`Payout failed: ${payout.id}`);
  }

  private static async updateOrderPaymentStatus(orderId: string, status: string, transactionId?: string): Promise<void> {
    // This would update the order payment status in the database
    // Implementation depends on your Prisma setup
    logger.info(`Updating order ${orderId} payment status to ${status}`);
  }

  private static async updatePayoutStatus(payoutId: string, status: string): Promise<void> {
    // This would update the payout status in the database
    logger.info(`Updating payout ${payoutId} status to ${status}`);
  }

  // Utility methods
  formatAmount(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Convert from cents
  }

  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 99999999; // Max 999,999.99 EUR
  }

  getSupportedCurrencies(): string[] {
    return ['EUR', 'USD', 'GBP', 'CHF'];
  }

  isStripeInitialized(): boolean {
    return this.stripe !== null;
  }
}

// Singleton instance
export const paymentService = PaymentService.getInstance();
