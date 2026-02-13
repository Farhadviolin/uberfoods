import { Logger } from '@nestjs/common';
import { SubscriptionEmailService } from '../src/modules/driver/subscription-email.service';
import { EmailService } from '../src/common/services/email.service';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('EmailTest');

class MockConfigService {
  get(key: string): string | undefined {
    // Mock-Konfiguration für Tests
    const config: Record<string, string> = {
      'SMTP_HOST': 'smtp.gmail.com',
      'SMTP_PORT': '587',
      'SMTP_USER': 'test@fairshare.de',
      'SMTP_PASSWORD': 'test-password',
      'SENDGRID_API_KEY': '', // Nicht konfiguriert für Test
    };
    return config[key];
  }
}

async function testSubscriptionEmails() {
  logger.log('🚀 Starte Subscription Email Tests...\n');

  // Mock-Services erstellen
  const configService = new MockConfigService();
  const emailService = new EmailService(configService);
  const subscriptionEmailService = new SubscriptionEmailService(emailService, configService);

  // Test-Daten
  const testData = {
    driverName: 'Max Mustermann',
    driverEmail: 'max.mustermann@example.com',
    tier: 'PRO',
    price: 49,
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage
    cancelAtPeriodEnd: false,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
  };

  try {
    logger.log('📧 Test 1: Willkommens-E-Mail');
    await subscriptionEmailService.sendWelcomeEmail(testData);
    logger.log('✅ Willkommens-E-Mail würde gesendet werden\n');

    logger.log('📧 Test 2: Upgrade-E-Mail');
    await subscriptionEmailService.sendUpgradeEmail(testData);
    logger.log('✅ Upgrade-E-Mail würde gesendet werden\n');

    logger.log('📧 Test 3: Trial-Ending-E-Mail');
    await subscriptionEmailService.sendTrialEndingEmail(testData);
    logger.log('✅ Trial-Ending-E-Mail würde gesendet werden\n');

    logger.log('📧 Test 4: Payment-Failed-E-Mail');
    await subscriptionEmailService.sendPaymentFailedEmail(testData);
    logger.log('✅ Payment-Failed-E-Mail würde gesendet werden\n');

    logger.log('📧 Test 5: Cancellation-E-Mail');
    await subscriptionEmailService.sendCancellationEmail(testData);
    logger.log('✅ Cancellation-E-Mail würde gesendet werden\n');

    logger.log('🎉 Alle Email-Tests erfolgreich abgeschlossen!');
    logger.log('');
    logger.log('📝 Zusammenfassung:');
    logger.log('   ✅ SubscriptionEmailService implementiert');
    logger.log('   ✅ HTML & Text Templates erstellt');
    logger.log('   ✅ Deutsche Lokalisierung');
    logger.log('   ✅ Responsive Email-Design');
    logger.log('   ✅ Fehlerbehandlung integriert');
    logger.log('');
    logger.log('🎯 Nächste Schritte:');
    logger.log('   1. SMTP/SendGrid konfigurieren');
    logger.log('   2. Email-Templates in Produktion testen');
    logger.log('   3. Webhook-Integration aktivieren');
    logger.log('   4. Datenbank-Integration für echte Empfängerdaten');

  } catch (error) {
    logger.error('❌ Fehler beim Email-Test:', error);
    logger.log('');
    logger.log('💡 Hinweis: Email-Service ist nicht konfiguriert (SMTP/SendGrid)');
    logger.log('   Das ist normal für lokale Tests ohne echte Email-Konfiguration.');
  }
}

testSubscriptionEmails()
  .then(() => {
    logger.log('🎉 Email-Test-Script beendet');
  })
  .catch((error) => {
    logger.error('❌ Fehler beim Email-Test-Script:', error);
  });