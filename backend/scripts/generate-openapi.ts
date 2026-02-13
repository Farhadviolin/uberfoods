import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateOpenAPI() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('UberFoods API')
    .setDescription('Food Delivery Platform API Dokumentation - Vollständige API-Referenz')
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.uberfoods.com', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentifizierung')
    .addTag('restaurants', 'Restaurant-Verwaltung')
    .addTag('dishes', 'Gericht-Verwaltung')
    .addTag('orders', 'Bestellungen')
    .addTag('customers', 'Kunden')
    .addTag('drivers', 'Fahrer')
    .addTag('payments', 'Zahlungen')
    .addTag('reviews', 'Bewertungen')
    .addTag('statistics', 'Statistiken')
    .addTag('social', 'Social Food Network')
    .addTag('gamification', 'Gamification')
    .addTag('group-orders', 'Gruppenbestellungen')
    .addTag('meal-planner', 'Meal Planner')
    .addTag('nutrition', 'Nutrition Tracker')
    .addTag('analytics', 'Analytics & Predictions')
    .addTag('inventory', 'Inventory Management')
    .addTag('staff', 'Staff Management')
    .addTag('accounting', 'Accounting & Finance')
    .addTag('chat', 'Chat & Communication')
    .addTag('admin', 'Admin Management')
    .addTag('monitoring', 'Monitoring & Health')
    .addTag('rbac', 'Role-Based Access Control')
    .addTag('automation', 'Automation')
    .addTag('integrations', 'Integrations')
    .addTag('reporting', 'Reporting')
    .addTag('multi-tenancy', 'Multi-Tenancy')
    .addTag('ai-ml', 'AI/ML Services')
    .addTag('websocket', 'WebSocket Events')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  // Export OpenAPI JSON
  const openApiPath = path.join(process.cwd(), 'openapi.json');
  fs.writeFileSync(openApiPath, JSON.stringify(document, null, 2));
  console.log(`✅ OpenAPI JSON exportiert nach: ${openApiPath}`);

  // Export OpenAPI YAML (optional)
  try {
    const yaml = require('js-yaml');
    const openApiYamlPath = path.join(process.cwd(), 'openapi.yaml');
    fs.writeFileSync(openApiYamlPath, yaml.dump(document, { indent: 2 }));
    console.log(`✅ OpenAPI YAML exportiert nach: ${openApiYamlPath}`);
  } catch (e) {
    console.warn('⚠️  YAML Export übersprungen (js-yaml nicht installiert)');
  }

  await app.close();
}

generateOpenAPI().catch(console.error);

