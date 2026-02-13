const { PrismaClient } = require('@prisma/client');

async function fixSchema() {
  const prisma = new PrismaClient();

  try {
    console.log('Starting schema fix...');

    // Execute individual statements
    console.log('Creating GDPRRequestType enum...');
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "GDPRRequestType" AS ENUM ('DATA_DELETION', 'DATA_PORTABILITY', 'DATA_RECTIFICATION', 'ACCESS_REQUEST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `;

    console.log('Creating GDPRRequestStatus enum...');
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "GDPRRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `;

    console.log('Adding stripeCustomerId column...');
    await prisma.$executeRaw`
      ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT
    `;

    console.log('Creating gdpr_requests table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "gdpr_requests" (
          "id" TEXT NOT NULL,
          "driverId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "reason" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "dataPackage" JSONB,
          "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "gdpr_requests_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Creating winback_campaign_logs table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "winback_campaign_logs" (
          "id" TEXT NOT NULL,
          "driverId" TEXT NOT NULL,
          "campaignId" TEXT NOT NULL,
          "discountCode" TEXT,
          "discountPercentage" DOUBLE PRECISION NOT NULL,
          "emailType" TEXT NOT NULL,
          "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "openedAt" TIMESTAMP(3),
          "clickedAt" TIMESTAMP(3),
          "convertedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "winback_campaign_logs_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Creating discount_codes table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "discount_codes" (
          "id" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
          "value" DOUBLE PRECISION NOT NULL,
          "validUntil" TIMESTAMP(3) NOT NULL,
          "usageLimit" INTEGER,
          "usedCount" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Creating customer_lifetime_value table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "customer_lifetime_value" (
          "id" TEXT NOT NULL,
          "driverId" TEXT NOT NULL,
          "historicalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "predictedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "segments" JSONB,
          "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "customer_lifetime_value_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Creating churn_predictions table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "churn_predictions" (
          "id" TEXT NOT NULL,
          "driverId" TEXT NOT NULL,
          "churnProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
          "predictedAt" TIMESTAMP(3) NOT NULL,
          "factors" JSONB,
          "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "churn_predictions_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Creating subscription_contracts table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "subscription_contracts" (
          "id" TEXT NOT NULL,
          "driverId" TEXT NOT NULL,
          "subscriptionId" TEXT NOT NULL,
          "contractNumber" TEXT NOT NULL,
          "contractData" JSONB NOT NULL,
          "pdfUrl" TEXT,
          "signedAt" TIMESTAMP(3),
          "expiresAt" TIMESTAMP(3),
          "status" TEXT NOT NULL DEFAULT 'DRAFT',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "subscription_contracts_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log('Schema fix completed successfully!');

  } catch (error) {
    console.error('Schema fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();