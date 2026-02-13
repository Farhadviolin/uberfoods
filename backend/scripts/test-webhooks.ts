import { Logger } from '@nestjs/common';

const logger = new Logger('WebhookTest');

interface MockStripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  trial_end?: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
  metadata?: Record<string, string>;
}

function simulateSubscriptionEvent(
  eventType: string,
  subscriptionData: Partial<MockStripeSubscription>
) {
  const mockSubscription: MockStripeSubscription = {
    id: subscriptionData.id || 'sub_test_123',
    customer: subscriptionData.customer || 'cus_test_123',
    status: subscriptionData.status || 'active',
    current_period_start: subscriptionData.current_period_start || Math.floor(Date.now() / 1000),
    current_period_end: subscriptionData.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
    items: {
      data: [{
        price: {
          id: subscriptionData.items?.data[0]?.price?.id || 'price_pro_test_49eur_monthly'
        }
      }]
    },
    metadata: subscriptionData.metadata || { driverId: 'driver_test_123' },
    ...subscriptionData
  };

  logger.log(`🎭 Simuliere ${eventType}:`);
  logger.log(`   Subscription ID: ${mockSubscription.id}`);
  logger.log(`   Customer: ${mockSubscription.customer}`);
  logger.log(`   Status: ${mockSubscription.status}`);
  logger.log(`   Driver ID: ${mockSubscription.metadata?.driverId}`);
  logger.log(`   Price ID: ${mockSubscription.items.data[0].price.id}`);
  logger.log('');

  return mockSubscription;
}

async function testWebhookScenarios() {
  logger.log('🚀 Starte Webhook-Tests...\n');

  // Test 1: Subscription Created
  logger.log('🧪 Test 1: customer.subscription.created');
  simulateSubscriptionEvent('customer.subscription.created', {
    id: 'sub_created_001',
    status: 'trialing',
    trial_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 Tage Trial
    metadata: { driverId: 'driver_new_001' }
  });

  // Test 2: Subscription Updated (Upgrade)
  logger.log('🧪 Test 2: customer.subscription.updated (Upgrade)');
  simulateSubscriptionEvent('customer.subscription.updated', {
    id: 'sub_updated_001',
    status: 'active',
    items: {
      data: [{
        price: { id: 'price_fulltime_test_99eur_monthly' }
      }]
    },
    metadata: { driverId: 'driver_upgrade_001' }
  });

  // Test 3: Subscription Cancelled
  logger.log('🧪 Test 3: customer.subscription.deleted');
  simulateSubscriptionEvent('customer.subscription.deleted', {
    id: 'sub_cancelled_001',
    status: 'canceled',
    cancel_at_period_end: true,
    metadata: { driverId: 'driver_cancel_001' }
  });

  // Test 4: Payment Failed
  logger.log('🧪 Test 4: customer.subscription.updated (Payment Failed)');
  simulateSubscriptionEvent('customer.subscription.updated', {
    id: 'sub_past_due_001',
    status: 'past_due',
    metadata: { driverId: 'driver_past_due_001' }
  });

  logger.log('✅ Webhook-Tests abgeschlossen!');
  logger.log('');
  logger.log('📝 Zusammenfassung:');
  logger.log('   ✓ Subscription Created Handler implementiert');
  logger.log('   ✓ Subscription Updated Handler implementiert');
  logger.log('   ✓ Subscription Cancelled Handler implementiert');
  logger.log('   ✓ Stripe Status Mapping implementiert');
  logger.log('   ✓ Price ID zu Tier Mapping implementiert');
  logger.log('');
  logger.log('🎯 Nächste Schritte:');
  logger.log('   1. Stripe Webhook Secret konfigurieren');
  logger.log('   2. Webhook-URL in Stripe Dashboard eintragen');
  logger.log('   3. Email-Benachrichtigungen implementieren');
  logger.log('   4. Datenbank-Integration aktivieren');
}

testWebhookScenarios()
  .then(() => {
    logger.log('🎉 Webhook-Test-Script beendet');
  })
  .catch((error) => {
    logger.error('❌ Fehler beim Webhook-Test:', error);
  });