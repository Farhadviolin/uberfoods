import { Logger } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('ProductionSetup');

async function setupProductionSubscriptions() {
  logger.log('🚀 Starte Produktions-Setup für Subscription-System...\n');

  const steps = [
    {
      name: 'Stripe Produkte erstellen',
      command: 'npm run setup:stripe-products',
      description: 'Erstellt Stripe Produkte und Preise, konfiguriert Price IDs'
    },
    {
      name: 'Datenbank-Migration ausführen',
      command: 'npm run prisma:migrate',
      description: 'Führt Prisma Migration für Subscription-Models aus'
    },
    {
      name: 'Tier-Konfiguration laden',
      command: 'npm run prisma:seed-tier-configs',
      description: 'Lädt Subscription Tier Konfigurationen in die Datenbank'
    },
    {
      name: 'Fahrer migrieren',
      command: 'npm run migrate:drivers',
      description: 'Migriert bestehende Fahrer auf BASIC Tier mit Trial-Periode'
    },
    {
      name: 'Integration testen',
      command: 'npm run test:integration',
      description: 'Führt vollständige Integrationstests aus'
    }
  ];

  let completedSteps = 0;
  let failedSteps = 0;

  for (const step of steps) {
    try {
      logger.log(`\n📋 Schritt ${completedSteps + failedSteps + 1}: ${step.name}`);
      logger.log(`   ${step.description}`);
      logger.log(`   Ausführung: ${step.command}`);

      // Führe den Befehl aus
      execSync(step.command, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      completedSteps++;
      logger.log(`✅ ${step.name} erfolgreich abgeschlossen\n`);

    } catch (error) {
      failedSteps++;
      logger.error(`❌ ${step.name} fehlgeschlagen:`, error.message);
      logger.log('🔄 Fahre mit nächsten Schritten fort...\n');
    }
  }

  // Zusammenfassung
  logger.log('='.repeat(60));
  logger.log('📊 PRODUKTIONS-SETUP ZUSAMMENFASSUNG');
  logger.log('='.repeat(60));

  logger.log(`✅ Erfolgreich: ${completedSteps}/${steps.length} Schritte`);
  logger.log(`❌ Fehlgeschlagen: ${failedSteps}/${steps.length} Schritte`);

  if (failedSteps === 0) {
    logger.log('\n🎉 ALLE SCHRITTE ERFOLGREICH!');
    logger.log('🏆 Subscription-System ist produktionsbereit!');
  } else {
    logger.log('\n⚠️  Einige Schritte sind fehlgeschlagen.');
    logger.log('🔧 Bitte beheben Sie die fehlgeschlagenen Schritte manuell.');
  }

  logger.log('\n📋 MANUELLE SCHRITTE (nach Setup):');
  logger.log('='.repeat(40));
  logger.log('1. 🔑 Stripe Secrets in production.env setzen:');
  logger.log('   - STRIPE_SECRET_KEY (STRIPE_SECRET_KEY_PLACEHOLDER_...)');
  logger.log('   - STRIPE_WEBHOOK_SECRET (STRIPE_WEBHOOK_SECRET_PLACEHOLDER_...)');
  logger.log('   - STRIPE_PUBLISHABLE_KEY (STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...)');
  logger.log('');
  logger.log('2. 📧 Email-Konfiguration:');
  logger.log('   - SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
  logger.log('   - ODER: SENDGRID_API_KEY');
  logger.log('');
  logger.log('3. 🗄️ Datenbank-Verbindung:');
  logger.log('   - DATABASE_URL mit Produktionsdatenbank');
  logger.log('');
  logger.log('4. 🌐 Stripe Webhook konfigurieren:');
  logger.log('   - URL: https://your-domain.com/api/payments/webhook');
  logger.log('   - Events: customer.subscription.*, invoice.*');
  logger.log('');
  logger.log('5. 🚀 Backend starten:');
  logger.log('   npm run start:prod');
  logger.log('');
  logger.log('6. ✅ Integration testen:');
  logger.log('   - Admin Panel: Subscription-Management');
  logger.log('   - Mobile App: Subscription-Screen');
  logger.log('   - API: /api/drivers/subscription');

  logger.log('\n💡 Support: Bei Problemen die Logs prüfen oder Support kontaktieren.');
}

setupProductionSubscriptions()
  .then(() => {
    logger.log('\n🎉 Produktions-Setup-Script beendet');
  })
  .catch((error) => {
    logger.error('❌ Fehler beim Produktions-Setup:', error);
    process.exit(1);
  });