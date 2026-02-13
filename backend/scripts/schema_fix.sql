-- Safe Schema Fix for Drift Resolution

-- CreateEnum
CREATE TYPE IF NOT EXISTS "GDPRRequestType" AS ENUM ('DATA_DELETION', 'DATA_PORTABILITY', 'DATA_RECTIFICATION', 'ACCESS_REQUEST');

-- CreateEnum
CREATE TYPE IF NOT EXISTS "GDPRRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "gdpr_requests" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "GDPRRequestType" NOT NULL,
    "reason" TEXT,
    "status" "GDPRRequestStatus" NOT NULL DEFAULT 'PENDING',
    "dataPackage" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gdpr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
);

-- CreateTable
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
);

-- CreateTable
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
);

-- CreateTable
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
);

-- CreateTable
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
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gdpr_requests_driverId_idx" ON "gdpr_requests"("driverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gdpr_requests_type_idx" ON "gdpr_requests"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gdpr_requests_status_idx" ON "gdpr_requests"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "winback_campaign_logs_driverId_idx" ON "winback_campaign_logs"("driverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "winback_campaign_logs_campaignId_idx" ON "winback_campaign_logs"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "winback_campaign_logs_sentAt_idx" ON "winback_campaign_logs"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discount_codes_code_idx" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discount_codes_validUntil_idx" ON "discount_codes"("validUntil");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "discount_codes_isActive_idx" ON "discount_codes"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "customer_lifetime_value_driverId_key" ON "customer_lifetime_value"("driverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_lifetime_value_driverId_idx" ON "customer_lifetime_value"("driverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_lifetime_value_totalValue_idx" ON "customer_lifetime_value"("totalValue");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_lifetime_value_lastCalculated_idx" ON "customer_lifetime_value"("lastCalculated");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "churn_predictions_driverId_key" ON "churn_predictions"("driverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "churn_predictions_driverId_idx" ON "churn_predictions"("driverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "churn_predictions_churnProbability_idx" ON "churn_predictions"("churnProbability");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "churn_predictions_riskLevel_idx" ON "churn_predictions"("riskLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "churn_predictions_predictedAt_idx" ON "churn_predictions"("predictedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_contracts_contractNumber_key" ON "subscription_contracts"("contractNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_contracts_driverId_idx" ON "subscription_contracts"("driverId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_contracts_subscriptionId_idx" ON "subscription_contracts"("subscriptionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_contracts_contractNumber_idx" ON "subscription_contracts"("contractNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_contracts_status_idx" ON "subscription_contracts"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_stripeCustomerId_key" ON "drivers"("stripeCustomerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_status_createdAt_id_idx" ON "orders"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_restaurantId_status_createdAt_id_idx" ON "orders"("restaurantId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_customerId_createdAt_id_idx" ON "orders"("customerId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "gdpr_requests" ADD CONSTRAINT "gdpr_requests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winback_campaign_logs" ADD CONSTRAINT "winback_campaign_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_lifetime_value" ADD CONSTRAINT "customer_lifetime_value_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "churn_predictions" ADD CONSTRAINT "churn_predictions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_contracts" ADD CONSTRAINT "subscription_contracts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_contracts" ADD CONSTRAINT "subscription_contracts_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "driver_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;