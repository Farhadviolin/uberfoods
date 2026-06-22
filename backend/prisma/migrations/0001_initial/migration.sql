-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY', 'SEPA_DIRECT_DEBIT', 'BANK_TRANSFER', 'SOFORT');

-- CreateEnum
CREATE TYPE "ReportingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "FinanzamtStatus" AS ENUM ('PENDING', 'REGISTERED', 'ACTIVE', 'SUSPENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "TaxReportType" AS ENUM ('ELDA', 'VAT_RETURN', 'ANNUAL');

-- CreateEnum
CREATE TYPE "TaxReportStatus" AS ENUM ('PENDING', 'GENERATED', 'SUBMITTED', 'CONFIRMED', 'ERROR');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'PRO', 'FULLTIME', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'CALCULATED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MLModelStatus" AS ENUM ('TRAINING', 'DEPLOYED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('NET_30', 'NET_60', 'IMMEDIATE');

-- CreateEnum
CREATE TYPE "SupplierOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING');

-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('SQUARE', 'ROUND', 'RECTANGLE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GDPRRequestType" AS ENUM ('DATA_DELETION', 'DATA_PORTABILITY', 'DATA_RECTIFICATION', 'ACCESS_REQUEST');

-- CreateEnum
CREATE TYPE "GDPRRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "socialAuthProvider" TEXT,
    "socialAuthId" TEXT,
    "socialAuthEmail" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "imageUrl" TEXT,
    "password" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "welcomeEmailSentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "avgPrepTime" INTEGER NOT NULL DEFAULT 15,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "freeDeliveryThreshold" DOUBLE PRECISION,
    "location" JSONB,
    "deliveryZones" JSONB,
    "operatingHours" JSONB,
    "estimatedDeliveryTime" INTEGER NOT NULL DEFAULT 30,
    "cuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "settings" JSONB,
    "metadata" JSONB,
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "welcomeEmailSentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "location" JSONB,
    "avatarUrl" TEXT,
    "vehicleInfo" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "currentStatus" TEXT NOT NULL DEFAULT 'OFFLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "stripeConnectAccountId" TEXT,
    "bankAccountVerified" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "fleetZoneId" TEXT,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_applications" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactCity" TEXT,
    "contactCountry" TEXT,
    "notes" TEXT,
    "consentTerms" BOOLEAN NOT NULL DEFAULT false,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "driverInfo" JSONB,
    "restaurantInfo" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_audit_events" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "orderId" TEXT,
    "location" JSONB,
    "deviceId" TEXT,
    "appVersion" TEXT,
    "networkType" TEXT,
    "battery" DOUBLE PRECISION,
    "region" TEXT,
    "isOfflineSync" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dishes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calories" INTEGER,
    "nutrition" JSONB,
    "prepTime" INTEGER,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancelReason" TEXT,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "address" TEXT,
    "phone" TEXT,
    "customerLocation" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "estimatedDeliveryTime" INTEGER,
    "deliveredAt" TIMESTAMP(3),
    "canCancelUntil" TIMESTAMP(3),
    "promotionId" TEXT,
    "priority" TEXT,
    "route" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actualDeliveryTime" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryAddress" TEXT,
    "deliveryInstructions" TEXT,
    "paymentMethod" TEXT,
    "transactionId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "modifications" JSONB,
    "specialInstructions" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Austria',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_favorites" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_alerts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'OPENED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "last4" TEXT,
    "brand" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "mandateId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "paymentMethodId" TEXT,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT,
    "transactionId" TEXT,
    "errorMessage" TEXT,
    "paymentMethodType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_tax_profiles" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "taxId" TEXT,
    "finanzamtId" TEXT,
    "finanzamtStatus" "FinanzamtStatus" NOT NULL DEFAULT 'PENDING',
    "autoReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoPayoutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportingFrequency" "ReportingFrequency" NOT NULL DEFAULT 'MONTHLY',
    "iban" TEXT,
    "bic" TEXT,
    "lastReportDate" TIMESTAMP(3),
    "lastPayoutDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tax_profiles" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "taxId" TEXT,
    "ustId" TEXT,
    "finanzamtId" TEXT,
    "finanzamtStatus" "FinanzamtStatus" NOT NULL DEFAULT 'PENDING',
    "autoReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoPayoutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportingFrequency" "ReportingFrequency" NOT NULL DEFAULT 'MONTHLY',
    "tseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tseSerialNumber" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "lastReportDate" TIMESTAMP(3),
    "lastPayoutDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_reports" (
    "id" TEXT NOT NULL,
    "driverTaxProfileId" TEXT,
    "restaurantTaxProfileId" TEXT,
    "entityType" TEXT NOT NULL,
    "type" "TaxReportType" NOT NULL,
    "period" TEXT NOT NULL,
    "status" "TaxReportStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "confirmationNumber" TEXT,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "driverTaxProfileId" TEXT,
    "restaurantTaxProfileId" TEXT,
    "entityType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "period" TEXT NOT NULL,
    "taxReportId" TEXT,
    "transactionId" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_subscriptions" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "customCommissionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "orderAmount" DOUBLE PRECISION NOT NULL,
    "restaurantCommission" DOUBLE PRECISION NOT NULL,
    "driverCommission" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tier_configs" (
    "id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "displayCommission" TEXT NOT NULL,
    "features" TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "deliveryLimit" INTEGER,
    "payoutThreshold" DOUBLE PRECISION,
    "payoutDelay" INTEGER,
    "bonusThreshold" INTEGER,
    "bonusRate" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordResetToken" TEXT,
    "passwordResetTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL DEFAULT 'ADMIN',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "two_factor_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetAudience" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "minOrderAmount" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "purchasedBy" TEXT,
    "redeemedBy" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "customerId" TEXT,
    "restaurantId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rewardAmount" DOUBLE PRECISION DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_programs" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsPerEuro" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "pointsPerOrder" INTEGER NOT NULL DEFAULT 0,
    "tierThresholds" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_loyalty" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastOrderDate" TIMESTAMP(3),
    "totalRewards" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_points_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "rewardId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_points_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DISCOUNT',
    "pointsCost" INTEGER NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION,
    "discountType" TEXT,
    "metadata" JSONB,
    "maxUses" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_gamification" (
    "customerId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "xpToNextLevel" INTEGER NOT NULL DEFAULT 100,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsWritten" INTEGER NOT NULL DEFAULT 0,
    "socialPosts" INTEGER NOT NULL DEFAULT 0,
    "socialLikes" INTEGER NOT NULL DEFAULT 0,
    "socialShares" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_gamification_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "requirements" JSONB,
    "rewardTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_achievements" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_chef_profiles" (
    "customerId" TEXT NOT NULL,
    "favoriteCuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietaryType" JSONB,
    "preferredPriceRange" TEXT,
    "tasteProfile" JSONB,
    "dietaryRestrictions" JSONB,
    "preferredIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dislikedIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastMealPlan" JSONB,
    "lastOrderDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_chef_profiles_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "legal_pages" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "updatedBy" TEXT,

    CONSTRAINT "legal_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_nutrition" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vitamins" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalCalories" INTEGER,
    "macroTargets" JSONB,
    "schedule" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3),
    "dishIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "executedAt" TIMESTAMP(3),
    "isExecuted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_orders" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "notes" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "items" JSONB,
    "payload" JSONB,
    "frequency" TEXT NOT NULL DEFAULT 'ONCE',
    "nextOrder" TIMESTAMP(3),
    "lastOrdered" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_orders" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_order_members" (
    "id" TEXT NOT NULL,
    "groupOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_order_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_order_items" (
    "id" TEXT NOT NULL,
    "groupOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT,
    "foodRating" DOUBLE PRECISION,
    "deliveryRating" DOUBLE PRECISION,
    "overallRating" DOUBLE PRECISION,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_images" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_replies" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_likes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_reports" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderName" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "dishId" TEXT,
    "orderId" TEXT,
    "content" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_challenges" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward" TEXT,
    "goal" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_challenge_participants" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_shares" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "message" TEXT,
    "shareType" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_bookmarks" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_hidden_posts" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_hidden_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_reports" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolutionAction" TEXT,
    "resolutionReason" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_social_posts" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "postId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salary" DOUBLE PRECISION,
    "hourlyRate" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_shifts" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_shifts" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "lastBreakTime" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contact" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxStock" DOUBLE PRECISION,
    "location" TEXT,
    "reorderPoint" DOUBLE PRECISION,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "expectedDelivery" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_records" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "oldQuantity" DOUBLE PRECISION NOT NULL,
    "newQuantity" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'manual_adjustment',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "layout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "parameters" JSONB,
    "config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "lastRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" JSONB,
    "actions" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT,
    "ruleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "details" JSONB,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "domain" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whitelabel_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "supportEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whitelabel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_billing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoices" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT true,
    "reviews" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "recipients" JSONB NOT NULL,
    "channels" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'sent',
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL DEFAULT 'DRIVER',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "customerId" TEXT,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "MLModelStatus" NOT NULL DEFAULT 'TRAINING',
    "accuracy" DOUBLE PRECISION,
    "version" TEXT NOT NULL,
    "lastTrained" TIMESTAMP(3),
    "trainingData" JSONB,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_predictions" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_schedules" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REGULAR',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_triggers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "available_integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "configSchema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "available_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_carts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT,
    "items" JSONB NOT NULL,
    "restaurantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_dishes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comments" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpfuls" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpfuls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_templates" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schedule" JSONB NOT NULL,
    "dishIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_notes" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_delays" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "delayReason" TEXT NOT NULL,
    "delayTime" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_delays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_order_actions" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "orderIds" TEXT[],
    "reason" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" JSONB NOT NULL,

    CONSTRAINT "bulk_order_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_optimizations" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "orderIds" TEXT[],
    "optimizedRoute" JSONB NOT NULL,
    "estimatedTime" INTEGER NOT NULL,
    "estimatedDistance" DOUBLE PRECISION NOT NULL,
    "trafficFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "weatherFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_histories" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "routeId" TEXT,
    "waypoints" JSONB NOT NULL,
    "actualTime" INTEGER,
    "actualDistance" DOUBLE PRECISION,
    "performance" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traffic_incidents" (
    "id" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "impact" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traffic_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_alternatives" (
    "id" TEXT NOT NULL,
    "originalRouteId" TEXT NOT NULL,
    "alternativeRoute" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "timeSavings" INTEGER,
    "distanceSavings" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverId" TEXT NOT NULL,

    CONSTRAINT "route_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_performances" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "onTimeDeliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerSatisfaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "efficiencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "goals" JSONB NOT NULL,
    "achievements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_goals" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "goalType" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deadline" TIMESTAMP(3),
    "reward" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_benchmarks" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_stats" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "badges" JSONB NOT NULL DEFAULT '[]',
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_achievements" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "gamification_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_quests" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "questType" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reward" JSONB NOT NULL,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_alerts" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'high',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "location" JSONB,
    "alertType" TEXT,
    "description" TEXT,
    "assignedResponderId" TEXT,
    "lastResponseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "response" JSONB,

    CONSTRAINT "emergency_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_incidents" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "location" JSONB,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "investigation" JSONB,
    "penalty" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_scores" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "components" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_logs" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "location" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_broadcasts" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "targetDrivers" TEXT[],
    "targetArea" JSONB,
    "emergencyType" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_dispatches" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "services" TEXT[],
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'DISPATCHED',
    "notes" TEXT,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_responses" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "userId" TEXT,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "tags" TEXT[],
    "resolution" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "resolvedById" TEXT,

    CONSTRAINT "system_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_incident_components" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AFFECTED',
    "notes" TEXT,

    CONSTRAINT "system_incident_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundaries" JSONB NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_schedules" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "region" TEXT,
    "zoneId" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'manual',
    "constraints" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_shifts" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "zoneId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "location" JSONB,
    "region" TEXT,
    "driverId" TEXT,
    "fuelType" TEXT NOT NULL DEFAULT 'GASOLINE',
    "fuelEfficiency" DOUBLE PRECISION,
    "lastMaintenance" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "mileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceExpiry" TIMESTAMP(3),
    "registrationExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_routes" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "totalDistance" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "fuelConsumption" DOUBLE PRECISION,
    "region" TEXT,
    "optimizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_waypoints" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "orderId" TEXT,
    "estimatedArrival" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_optimizations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "region" TEXT,
    "constraints" JSONB,
    "timeWindow" JSONB,
    "results" JSONB NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_route_optimizations" (
    "id" TEXT NOT NULL,
    "routeIds" TEXT[],
    "optimizationGoal" TEXT NOT NULL,
    "constraints" JSONB,
    "results" JSONB NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_route_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_budgets" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'global',
    "amount" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_incidents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "location" JSONB,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "region" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_alerts" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_rewards" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'distributed',
    "distributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "estimatedDeliveryTime" INTEGER NOT NULL,
    "estimatedDistance" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    "reasoning" TEXT[],
    "alternatives" JSONB,
    "actualDeliveryTime" INTEGER,
    "actualDistance" DOUBLE PRECISION,
    "success" BOOLEAN,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "algorithms" TEXT[],
    "duration" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "region" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "results" JSONB,
    "winner" TEXT,
    "confidence" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_expenses" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "receipt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_projections" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "projectedEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectedExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectedNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "factors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_deductions" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receipt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_bonuses" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "bonusType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_budgets" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "categories" JSONB NOT NULL,
    "actual" JSONB NOT NULL,
    "alerts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_features" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "resetDate" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usage" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "usage" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER,
    "period" TEXT NOT NULL,
    "resetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_analytics" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "featureUsage" JSONB NOT NULL,
    "costSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION,
    "recommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_glasses_sessions" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "batteryLevel" INTEGER,
    "settings" JSONB,
    "navigation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_glasses_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_commands" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "parameters" JSONB,
    "response" TEXT,
    "confidence" DOUBLE PRECISION,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scans" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_orders" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_app_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceApp" TEXT NOT NULL,
    "targetApps" TEXT[],
    "data" JSONB NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_app_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "correlationId" TEXT,
    "causationId" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "currentStep" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orchestration_executions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "rule" JSONB,
    "event" JSONB,

    CONSTRAINT "orchestration_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_incidents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" JSONB,
    "reportedBy" TEXT NOT NULL,
    "reportedFrom" TEXT NOT NULL,
    "affectedUsers" TEXT[],
    "workflowId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_app_support_tickets" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "contactMethod" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'de',
    "assignedTeam" TEXT,
    "assignedAgent" TEXT,
    "workflowId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_app_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_reports" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timeRange" JSONB NOT NULL,
    "metrics" TEXT[],
    "filters" JSONB,
    "data" JSONB NOT NULL,
    "recipients" TEXT[],
    "format" TEXT NOT NULL DEFAULT 'dashboard',
    "status" TEXT NOT NULL DEFAULT 'generating',
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_app_customer_feedback" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "driverId" TEXT,
    "rating" JSONB NOT NULL,
    "comment" TEXT,
    "sentiment" TEXT NOT NULL,
    "analysis" JSONB,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "actionItems" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'received',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_app_customer_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_investigations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "relatedOrderId" TEXT,
    "relatedRestaurantId" TEXT,
    "relatedDriverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "assignedTo" TEXT,
    "findings" JSONB,
    "correctiveActions" TEXT[],
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "lastSyncTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "localData" JSONB NOT NULL,
    "serverData" JSONB NOT NULL,
    "conflictType" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_locations" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Österreich',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "operatingHours" JSONB,
    "managerId" TEXT,
    "managerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_orders" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "status" "SupplierOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "shape" "TableShape" NOT NULL DEFAULT 'SQUARE',
    "location" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "reservationTime" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_requests" (
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
CREATE TABLE "winback_campaign_logs" (
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
CREATE TABLE "discount_codes" (
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
CREATE TABLE "customer_lifetime_value" (
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
CREATE TABLE "churn_predictions" (
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
CREATE TABLE "subscription_contracts" (
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

-- CreateTable
CREATE TABLE "_FleetRouteToOrder" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_socialAuthId_idx" ON "customers"("socialAuthId");

-- CreateIndex
CREATE INDEX "customers_socialAuthProvider_idx" ON "customers"("socialAuthProvider");

-- CreateIndex
CREATE INDEX "customers_isActive_idx" ON "customers"("isActive");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_createdAt_idx" ON "customers"("createdAt");

-- CreateIndex
CREATE INDEX "customers_isActive_createdAt_idx" ON "customers"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "customers_status_createdAt_idx" ON "customers"("status", "createdAt");

-- CreateIndex
CREATE INDEX "customers_name_email_idx" ON "customers"("name", "email");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_email_key" ON "restaurants"("email");

-- CreateIndex
CREATE INDEX "restaurants_isActive_idx" ON "restaurants"("isActive");

-- CreateIndex
CREATE INDEX "restaurants_status_idx" ON "restaurants"("status");

-- CreateIndex
CREATE INDEX "restaurants_createdAt_idx" ON "restaurants"("createdAt");

-- CreateIndex
CREATE INDEX "restaurants_isActive_status_idx" ON "restaurants"("isActive", "status");

-- CreateIndex
CREATE INDEX "restaurants_isActive_createdAt_idx" ON "restaurants"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_stripeCustomerId_key" ON "drivers"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "drivers_isActive_idx" ON "drivers"("isActive");

-- CreateIndex
CREATE INDEX "drivers_currentStatus_idx" ON "drivers"("currentStatus");

-- CreateIndex
CREATE INDEX "drivers_email_idx" ON "drivers"("email");

-- CreateIndex
CREATE INDEX "drivers_rating_idx" ON "drivers"("rating");

-- CreateIndex
CREATE INDEX "drivers_isActive_currentStatus_createdAt_idx" ON "drivers"("isActive", "currentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "drivers_currentStatus_rating_idx" ON "drivers"("currentStatus", "rating");

-- CreateIndex
CREATE INDEX "drivers_name_email_idx" ON "drivers"("name", "email");

-- CreateIndex
CREATE INDEX "partner_applications_role_idx" ON "partner_applications"("role");

-- CreateIndex
CREATE INDEX "partner_applications_status_idx" ON "partner_applications"("status");

-- CreateIndex
CREATE INDEX "partner_applications_createdAt_idx" ON "partner_applications"("createdAt");

-- CreateIndex
CREATE INDEX "driver_audit_events_driverId_createdAt_idx" ON "driver_audit_events"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "driver_audit_events_driverId_action_createdAt_idx" ON "driver_audit_events"("driverId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "driver_audit_events_orderId_createdAt_idx" ON "driver_audit_events"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "driver_audit_events_region_createdAt_idx" ON "driver_audit_events"("region", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "dishes_restaurantId_isAvailable_idx" ON "dishes"("restaurantId", "isAvailable");

-- CreateIndex
CREATE INDEX "dishes_category_idx" ON "dishes"("category");

-- CreateIndex
CREATE INDEX "dishes_isAvailable_idx" ON "dishes"("isAvailable");

-- CreateIndex
CREATE INDEX "dishes_categoryId_idx" ON "dishes"("categoryId");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_restaurantId_idx" ON "orders"("restaurantId");

-- CreateIndex
CREATE INDEX "orders_driverId_idx" ON "orders"("driverId");

-- CreateIndex
CREATE INDEX "orders_promotionId_idx" ON "orders"("promotionId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_restaurantId_status_idx" ON "orders"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_restaurantId_idx" ON "orders"("status", "createdAt", "restaurantId");

-- CreateIndex
CREATE INDEX "orders_driverId_status_idx" ON "orders"("driverId", "status");

-- CreateIndex
CREATE INDEX "orders_status_deliveredAt_idx" ON "orders"("status", "deliveredAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_id_idx" ON "orders"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "orders_restaurantId_status_createdAt_id_idx" ON "orders"("restaurantId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "orders_customerId_createdAt_id_idx" ON "orders"("customerId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "addresses_customerId_idx" ON "addresses"("customerId");

-- CreateIndex
CREATE INDEX "addresses_customerId_isDefault_idx" ON "addresses"("customerId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorites_customerId_restaurantId_key" ON "customer_favorites"("customerId", "restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_alerts_customerId_idx" ON "restaurant_alerts"("customerId");

-- CreateIndex
CREATE INDEX "restaurant_alerts_restaurantId_idx" ON "restaurant_alerts"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_alerts_isActive_idx" ON "restaurant_alerts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_alerts_customerId_restaurantId_alertType_key" ON "restaurant_alerts"("customerId", "restaurantId", "alertType");

-- CreateIndex
CREATE INDEX "payment_methods_customerId_idx" ON "payment_methods"("customerId");

-- CreateIndex
CREATE INDEX "payment_methods_customerId_paymentMethodId_idx" ON "payment_methods"("customerId", "paymentMethodId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_customerId_status_idx" ON "payments"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_tax_profiles_driverId_key" ON "driver_tax_profiles"("driverId");

-- CreateIndex
CREATE INDEX "driver_tax_profiles_driverId_idx" ON "driver_tax_profiles"("driverId");

-- CreateIndex
CREATE INDEX "driver_tax_profiles_finanzamtStatus_idx" ON "driver_tax_profiles"("finanzamtStatus");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tax_profiles_restaurantId_key" ON "restaurant_tax_profiles"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_tax_profiles_restaurantId_idx" ON "restaurant_tax_profiles"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_tax_profiles_finanzamtStatus_idx" ON "restaurant_tax_profiles"("finanzamtStatus");

-- CreateIndex
CREATE INDEX "tax_reports_driverTaxProfileId_idx" ON "tax_reports"("driverTaxProfileId");

-- CreateIndex
CREATE INDEX "tax_reports_restaurantTaxProfileId_idx" ON "tax_reports"("restaurantTaxProfileId");

-- CreateIndex
CREATE INDEX "tax_reports_status_idx" ON "tax_reports"("status");

-- CreateIndex
CREATE INDEX "tax_reports_period_idx" ON "tax_reports"("period");

-- CreateIndex
CREATE INDEX "payouts_driverTaxProfileId_idx" ON "payouts"("driverTaxProfileId");

-- CreateIndex
CREATE INDEX "payouts_restaurantTaxProfileId_idx" ON "payouts"("restaurantTaxProfileId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_period_idx" ON "payouts"("period");

-- CreateIndex
CREATE INDEX "financial_events_type_idx" ON "financial_events"("type");

-- CreateIndex
CREATE INDEX "financial_events_timestamp_idx" ON "financial_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "driver_subscriptions_driverId_key" ON "driver_subscriptions"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_subscriptions_stripeSubscriptionId_key" ON "driver_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "driver_subscriptions_driverId_idx" ON "driver_subscriptions"("driverId");

-- CreateIndex
CREATE INDEX "driver_subscriptions_status_idx" ON "driver_subscriptions"("status");

-- CreateIndex
CREATE INDEX "driver_subscriptions_tier_idx" ON "driver_subscriptions"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "commission_transactions_orderId_key" ON "commission_transactions"("orderId");

-- CreateIndex
CREATE INDEX "commission_transactions_driverId_idx" ON "commission_transactions"("driverId");

-- CreateIndex
CREATE INDEX "commission_transactions_orderId_idx" ON "commission_transactions"("orderId");

-- CreateIndex
CREATE INDEX "commission_transactions_status_idx" ON "commission_transactions"("status");

-- CreateIndex
CREATE INDEX "commission_transactions_tier_idx" ON "commission_transactions"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tier_configs_tier_key" ON "subscription_tier_configs"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_auth_userId_key" ON "two_factor_auth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_restaurantId_idx" ON "promotions"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- CreateIndex
CREATE INDEX "gift_cards_customerId_idx" ON "gift_cards"("customerId");

-- CreateIndex
CREATE INDEX "gift_cards_restaurantId_idx" ON "gift_cards"("restaurantId");

-- CreateIndex
CREATE INDEX "gift_cards_purchasedBy_idx" ON "gift_cards"("purchasedBy");

-- CreateIndex
CREATE INDEX "gift_cards_redeemedBy_idx" ON "gift_cards"("redeemedBy");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_code_key" ON "referrals"("code");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_referredId_idx" ON "referrals"("referredId");

-- CreateIndex
CREATE INDEX "loyalty_programs_restaurantId_idx" ON "loyalty_programs"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_customerId_key" ON "customer_loyalty"("customerId");

-- CreateIndex
CREATE INDEX "customer_loyalty_programId_idx" ON "customer_loyalty"("programId");

-- CreateIndex
CREATE INDEX "loyalty_points_history_customerId_idx" ON "loyalty_points_history"("customerId");

-- CreateIndex
CREATE INDEX "loyalty_points_history_rewardId_idx" ON "loyalty_points_history"("rewardId");

-- CreateIndex
CREATE INDEX "loyalty_points_history_orderId_idx" ON "loyalty_points_history"("orderId");

-- CreateIndex
CREATE INDEX "rewards_programId_idx" ON "rewards"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_achievements_customerId_achievementId_key" ON "customer_achievements"("customerId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_pages_slug_key" ON "legal_pages"("slug");

-- CreateIndex
CREATE INDEX "legal_pages_restaurantId_idx" ON "legal_pages"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "dish_nutrition_dishId_key" ON "dish_nutrition"("dishId");

-- CreateIndex
CREATE INDEX "meal_plans_customerId_idx" ON "meal_plans"("customerId");

-- CreateIndex
CREATE INDEX "meal_plans_restaurantId_idx" ON "meal_plans"("restaurantId");

-- CreateIndex
CREATE INDEX "scheduled_orders_customerId_idx" ON "scheduled_orders"("customerId");

-- CreateIndex
CREATE INDEX "scheduled_orders_restaurantId_idx" ON "scheduled_orders"("restaurantId");

-- CreateIndex
CREATE INDEX "group_orders_restaurantId_idx" ON "group_orders"("restaurantId");

-- CreateIndex
CREATE INDEX "group_orders_hostId_idx" ON "group_orders"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "group_order_members_groupOrderId_customerId_key" ON "group_order_members"("groupOrderId", "customerId");

-- CreateIndex
CREATE INDEX "reviews_customerId_idx" ON "reviews"("customerId");

-- CreateIndex
CREATE INDEX "reviews_restaurantId_idx" ON "reviews"("restaurantId");

-- CreateIndex
CREATE INDEX "reviews_orderId_idx" ON "reviews"("orderId");

-- CreateIndex
CREATE INDEX "reviews_driverId_idx" ON "reviews"("driverId");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "reviews_restaurantId_rating_idx" ON "reviews"("restaurantId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "review_replies_reviewId_key" ON "review_replies"("reviewId");

-- CreateIndex
CREATE INDEX "review_replies_reviewId_idx" ON "review_replies"("reviewId");

-- CreateIndex
CREATE INDEX "review_replies_restaurantId_idx" ON "review_replies"("restaurantId");

-- CreateIndex
CREATE INDEX "review_likes_reviewId_idx" ON "review_likes"("reviewId");

-- CreateIndex
CREATE INDEX "review_likes_customerId_idx" ON "review_likes"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "review_likes_reviewId_customerId_key" ON "review_likes"("reviewId", "customerId");

-- CreateIndex
CREATE INDEX "review_reports_reviewId_idx" ON "review_reports"("reviewId");

-- CreateIndex
CREATE INDEX "review_reports_customerId_idx" ON "review_reports"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "review_reports_reviewId_customerId_key" ON "review_reports"("reviewId", "customerId");

-- CreateIndex
CREATE INDEX "chat_messages_orderId_idx" ON "chat_messages"("orderId");

-- CreateIndex
CREATE INDEX "social_posts_customerId_idx" ON "social_posts"("customerId");

-- CreateIndex
CREATE INDEX "social_posts_restaurantId_idx" ON "social_posts"("restaurantId");

-- CreateIndex
CREATE INDEX "social_posts_dishId_idx" ON "social_posts"("dishId");

-- CreateIndex
CREATE INDEX "social_posts_isPublic_idx" ON "social_posts"("isPublic");

-- CreateIndex
CREATE INDEX "social_posts_isDeleted_idx" ON "social_posts"("isDeleted");

-- CreateIndex
CREATE INDEX "social_posts_createdAt_idx" ON "social_posts"("createdAt");

-- CreateIndex
CREATE INDEX "social_posts_customerId_createdAt_idx" ON "social_posts"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "social_comments_postId_idx" ON "social_comments"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "social_likes_postId_customerId_key" ON "social_likes"("postId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "social_follows_followerId_followingId_key" ON "social_follows"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "social_challenge_participants_challengeId_customerId_key" ON "social_challenge_participants"("challengeId", "customerId");

-- CreateIndex
CREATE INDEX "social_shares_postId_idx" ON "social_shares"("postId");

-- CreateIndex
CREATE INDEX "social_shares_customerId_idx" ON "social_shares"("customerId");

-- CreateIndex
CREATE INDEX "social_bookmarks_customerId_idx" ON "social_bookmarks"("customerId");

-- CreateIndex
CREATE INDEX "social_bookmarks_postId_idx" ON "social_bookmarks"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "social_bookmarks_customerId_postId_key" ON "social_bookmarks"("customerId", "postId");

-- CreateIndex
CREATE INDEX "social_hidden_posts_customerId_idx" ON "social_hidden_posts"("customerId");

-- CreateIndex
CREATE INDEX "social_hidden_posts_postId_idx" ON "social_hidden_posts"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "social_hidden_posts_customerId_postId_key" ON "social_hidden_posts"("customerId", "postId");

-- CreateIndex
CREATE INDEX "social_reports_postId_idx" ON "social_reports"("postId");

-- CreateIndex
CREATE INDEX "social_reports_customerId_idx" ON "social_reports"("customerId");

-- CreateIndex
CREATE INDEX "social_reports_status_idx" ON "social_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "social_reports_customerId_postId_key" ON "social_reports"("customerId", "postId");

-- CreateIndex
CREATE INDEX "restaurant_social_posts_restaurantId_idx" ON "restaurant_social_posts"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_social_posts_platform_idx" ON "restaurant_social_posts"("platform");

-- CreateIndex
CREATE INDEX "restaurant_social_posts_status_idx" ON "restaurant_social_posts"("status");

-- CreateIndex
CREATE INDEX "restaurant_social_posts_scheduledAt_idx" ON "restaurant_social_posts"("scheduledAt");

-- CreateIndex
CREATE INDEX "staff_restaurantId_idx" ON "staff"("restaurantId");

-- CreateIndex
CREATE INDEX "staff_shifts_staffId_idx" ON "staff_shifts"("staffId");

-- CreateIndex
CREATE INDEX "driver_shifts_driverId_idx" ON "driver_shifts"("driverId");

-- CreateIndex
CREATE INDEX "stock_items_restaurantId_idx" ON "stock_items"("restaurantId");

-- CreateIndex
CREATE INDEX "stock_items_supplierId_idx" ON "stock_items"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "waste_records_stockItemId_idx" ON "waste_records"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_movements_stockItemId_idx" ON "stock_movements"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_reason_idx" ON "stock_movements"("reason");

-- CreateIndex
CREATE INDEX "scheduled_reports_reportId_idx" ON "scheduled_reports"("reportId");

-- CreateIndex
CREATE INDEX "execution_logs_workflowId_idx" ON "execution_logs"("workflowId");

-- CreateIndex
CREATE INDEX "execution_logs_ruleId_idx" ON "execution_logs"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "whitelabel_configs_tenantId_key" ON "whitelabel_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_tenantId_key" ON "tenant_billing"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_key" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");

-- CreateIndex
CREATE INDEX "notification_settings_userId_idx" ON "notification_settings"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "scheduled_notifications_userId_idx" ON "scheduled_notifications"("userId");

-- CreateIndex
CREATE INDEX "scheduled_notifications_scheduledFor_idx" ON "scheduled_notifications"("scheduledFor");

-- CreateIndex
CREATE INDEX "scheduled_notifications_status_idx" ON "scheduled_notifications"("status");

-- CreateIndex
CREATE INDEX "unified_notifications_type_idx" ON "unified_notifications"("type");

-- CreateIndex
CREATE INDEX "unified_notifications_priority_idx" ON "unified_notifications"("priority");

-- CreateIndex
CREATE INDEX "unified_notifications_status_idx" ON "unified_notifications"("status");

-- CreateIndex
CREATE INDEX "unified_notifications_sentAt_idx" ON "unified_notifications"("sentAt");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticketId_idx" ON "support_ticket_messages"("ticketId");

-- CreateIndex
CREATE INDEX "support_ticket_messages_createdAt_idx" ON "support_ticket_messages"("createdAt");

-- CreateIndex
CREATE INDEX "chat_sessions_ticketId_idx" ON "chat_sessions"("ticketId");

-- CreateIndex
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions"("status");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "faqs_isActive_idx" ON "faqs"("isActive");

-- CreateIndex
CREATE INDEX "knowledge_base_articles_category_idx" ON "knowledge_base_articles"("category");

-- CreateIndex
CREATE INDEX "knowledge_base_articles_isPublished_idx" ON "knowledge_base_articles"("isPublished");

-- CreateIndex
CREATE INDEX "ml_models_type_idx" ON "ml_models"("type");

-- CreateIndex
CREATE INDEX "ml_models_status_idx" ON "ml_models"("status");

-- CreateIndex
CREATE INDEX "ml_predictions_modelId_idx" ON "ml_predictions"("modelId");

-- CreateIndex
CREATE INDEX "ml_predictions_createdAt_idx" ON "ml_predictions"("createdAt");

-- CreateIndex
CREATE INDEX "driver_schedules_driverId_idx" ON "driver_schedules"("driverId");

-- CreateIndex
CREATE INDEX "driver_schedules_date_idx" ON "driver_schedules"("date");

-- CreateIndex
CREATE INDEX "automation_triggers_type_idx" ON "automation_triggers"("type");

-- CreateIndex
CREATE INDEX "automation_triggers_isActive_idx" ON "automation_triggers"("isActive");

-- CreateIndex
CREATE INDEX "scheduled_tasks_status_idx" ON "scheduled_tasks"("status");

-- CreateIndex
CREATE INDEX "scheduled_tasks_nextRun_idx" ON "scheduled_tasks"("nextRun");

-- CreateIndex
CREATE INDEX "marketing_templates_type_idx" ON "marketing_templates"("type");

-- CreateIndex
CREATE INDEX "marketing_templates_isActive_idx" ON "marketing_templates"("isActive");

-- CreateIndex
CREATE INDEX "marketing_segments_name_idx" ON "marketing_segments"("name");

-- CreateIndex
CREATE INDEX "report_templates_type_idx" ON "report_templates"("type");

-- CreateIndex
CREATE INDEX "report_templates_isActive_idx" ON "report_templates"("isActive");

-- CreateIndex
CREATE INDEX "available_integrations_type_idx" ON "available_integrations"("type");

-- CreateIndex
CREATE INDEX "available_integrations_isActive_idx" ON "available_integrations"("isActive");

-- CreateIndex
CREATE INDEX "saved_carts_customerId_idx" ON "saved_carts"("customerId");

-- CreateIndex
CREATE INDEX "saved_carts_restaurantId_idx" ON "saved_carts"("restaurantId");

-- CreateIndex
CREATE INDEX "favorite_dishes_customerId_idx" ON "favorite_dishes"("customerId");

-- CreateIndex
CREATE INDEX "favorite_dishes_dishId_idx" ON "favorite_dishes"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_dishes_customerId_dishId_key" ON "favorite_dishes"("customerId", "dishId");

-- CreateIndex
CREATE INDEX "review_comments_reviewId_idx" ON "review_comments"("reviewId");

-- CreateIndex
CREATE INDEX "review_comments_customerId_idx" ON "review_comments"("customerId");

-- CreateIndex
CREATE INDEX "review_helpfuls_reviewId_idx" ON "review_helpfuls"("reviewId");

-- CreateIndex
CREATE INDEX "review_helpfuls_customerId_idx" ON "review_helpfuls"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpfuls_reviewId_customerId_key" ON "review_helpfuls"("reviewId", "customerId");

-- CreateIndex
CREATE INDEX "meal_plan_templates_customerId_idx" ON "meal_plan_templates"("customerId");

-- CreateIndex
CREATE INDEX "meal_plan_templates_isPublic_idx" ON "meal_plan_templates"("isPublic");

-- CreateIndex
CREATE INDEX "order_notes_orderId_idx" ON "order_notes"("orderId");

-- CreateIndex
CREATE INDEX "order_notes_driverId_idx" ON "order_notes"("driverId");

-- CreateIndex
CREATE INDEX "order_delays_orderId_idx" ON "order_delays"("orderId");

-- CreateIndex
CREATE INDEX "order_delays_driverId_idx" ON "order_delays"("driverId");

-- CreateIndex
CREATE INDEX "bulk_order_actions_driverId_idx" ON "bulk_order_actions"("driverId");

-- CreateIndex
CREATE INDEX "route_optimizations_driverId_idx" ON "route_optimizations"("driverId");

-- CreateIndex
CREATE INDEX "route_histories_driverId_idx" ON "route_histories"("driverId");

-- CreateIndex
CREATE INDEX "route_histories_completedAt_idx" ON "route_histories"("completedAt");

-- CreateIndex
CREATE INDEX "traffic_incidents_startTime_idx" ON "traffic_incidents"("startTime");

-- CreateIndex
CREATE INDEX "traffic_incidents_endTime_idx" ON "traffic_incidents"("endTime");

-- CreateIndex
CREATE INDEX "route_alternatives_driverId_idx" ON "route_alternatives"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_performances_driverId_key" ON "driver_performances"("driverId");

-- CreateIndex
CREATE INDEX "driver_performances_driverId_idx" ON "driver_performances"("driverId");

-- CreateIndex
CREATE INDEX "driver_performances_period_idx" ON "driver_performances"("period");

-- CreateIndex
CREATE INDEX "driver_performances_periodStart_idx" ON "driver_performances"("periodStart");

-- CreateIndex
CREATE INDEX "performance_goals_driverId_idx" ON "performance_goals"("driverId");

-- CreateIndex
CREATE INDEX "performance_goals_goalType_idx" ON "performance_goals"("goalType");

-- CreateIndex
CREATE INDEX "performance_benchmarks_region_idx" ON "performance_benchmarks"("region");

-- CreateIndex
CREATE INDEX "performance_benchmarks_metric_idx" ON "performance_benchmarks"("metric");

-- CreateIndex
CREATE UNIQUE INDEX "performance_benchmarks_region_metric_percentile_period_key" ON "performance_benchmarks"("region", "metric", "percentile", "period");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_stats_driverId_key" ON "gamification_stats"("driverId");

-- CreateIndex
CREATE INDEX "gamification_stats_driverId_idx" ON "gamification_stats"("driverId");

-- CreateIndex
CREATE INDEX "gamification_challenges_type_idx" ON "gamification_challenges"("type");

-- CreateIndex
CREATE INDEX "gamification_challenges_isActive_idx" ON "gamification_challenges"("isActive");

-- CreateIndex
CREATE INDEX "gamification_achievements_driverId_idx" ON "gamification_achievements"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_achievements_driverId_achievementId_key" ON "gamification_achievements"("driverId", "achievementId");

-- CreateIndex
CREATE INDEX "gamification_quests_driverId_idx" ON "gamification_quests"("driverId");

-- CreateIndex
CREATE INDEX "gamification_quests_status_idx" ON "gamification_quests"("status");

-- CreateIndex
CREATE INDEX "emergency_alerts_driverId_idx" ON "emergency_alerts"("driverId");

-- CreateIndex
CREATE INDEX "emergency_alerts_type_idx" ON "emergency_alerts"("type");

-- CreateIndex
CREATE INDEX "emergency_alerts_severity_idx" ON "emergency_alerts"("severity");

-- CreateIndex
CREATE INDEX "emergency_alerts_status_idx" ON "emergency_alerts"("status");

-- CreateIndex
CREATE INDEX "safety_incidents_driverId_idx" ON "safety_incidents"("driverId");

-- CreateIndex
CREATE INDEX "safety_incidents_incidentType_idx" ON "safety_incidents"("incidentType");

-- CreateIndex
CREATE UNIQUE INDEX "safety_scores_driverId_key" ON "safety_scores"("driverId");

-- CreateIndex
CREATE INDEX "safety_scores_driverId_idx" ON "safety_scores"("driverId");

-- CreateIndex
CREATE INDEX "emergency_logs_driverId_idx" ON "emergency_logs"("driverId");

-- CreateIndex
CREATE INDEX "emergency_logs_severity_idx" ON "emergency_logs"("severity");

-- CreateIndex
CREATE INDEX "emergency_logs_createdAt_idx" ON "emergency_logs"("createdAt");

-- CreateIndex
CREATE INDEX "emergency_contacts_driverId_idx" ON "emergency_contacts"("driverId");

-- CreateIndex
CREATE INDEX "emergency_broadcasts_adminId_idx" ON "emergency_broadcasts"("adminId");

-- CreateIndex
CREATE INDEX "emergency_broadcasts_priority_idx" ON "emergency_broadcasts"("priority");

-- CreateIndex
CREATE INDEX "emergency_dispatches_emergencyId_idx" ON "emergency_dispatches"("emergencyId");

-- CreateIndex
CREATE INDEX "emergency_dispatches_status_idx" ON "emergency_dispatches"("status");

-- CreateIndex
CREATE INDEX "emergency_responses_emergencyId_idx" ON "emergency_responses"("emergencyId");

-- CreateIndex
CREATE INDEX "emergency_responses_responderId_idx" ON "emergency_responses"("responderId");

-- CreateIndex
CREATE INDEX "system_alerts_type_idx" ON "system_alerts"("type");

-- CreateIndex
CREATE INDEX "system_alerts_source_idx" ON "system_alerts"("source");

-- CreateIndex
CREATE INDEX "system_alerts_acknowledged_idx" ON "system_alerts"("acknowledged");

-- CreateIndex
CREATE INDEX "system_alerts_timestamp_idx" ON "system_alerts"("timestamp");

-- CreateIndex
CREATE INDEX "application_logs_level_idx" ON "application_logs"("level");

-- CreateIndex
CREATE INDEX "application_logs_component_idx" ON "application_logs"("component");

-- CreateIndex
CREATE INDEX "application_logs_userId_idx" ON "application_logs"("userId");

-- CreateIndex
CREATE INDEX "application_logs_timestamp_idx" ON "application_logs"("timestamp");

-- CreateIndex
CREATE INDEX "system_incidents_severity_idx" ON "system_incidents"("severity");

-- CreateIndex
CREATE INDEX "system_incidents_component_idx" ON "system_incidents"("component");

-- CreateIndex
CREATE INDEX "system_incidents_status_idx" ON "system_incidents"("status");

-- CreateIndex
CREATE INDEX "system_incidents_createdAt_idx" ON "system_incidents"("createdAt");

-- CreateIndex
CREATE INDEX "system_incident_components_incidentId_idx" ON "system_incident_components"("incidentId");

-- CreateIndex
CREATE INDEX "system_incident_components_component_idx" ON "system_incident_components"("component");

-- CreateIndex
CREATE INDEX "fleet_zones_region_idx" ON "fleet_zones"("region");

-- CreateIndex
CREATE INDEX "fleet_zones_priority_idx" ON "fleet_zones"("priority");

-- CreateIndex
CREATE INDEX "fleet_zones_isActive_idx" ON "fleet_zones"("isActive");

-- CreateIndex
CREATE INDEX "fleet_schedules_date_idx" ON "fleet_schedules"("date");

-- CreateIndex
CREATE INDEX "fleet_schedules_region_idx" ON "fleet_schedules"("region");

-- CreateIndex
CREATE INDEX "fleet_schedules_isActive_idx" ON "fleet_schedules"("isActive");

-- CreateIndex
CREATE INDEX "fleet_shifts_scheduleId_idx" ON "fleet_shifts"("scheduleId");

-- CreateIndex
CREATE INDEX "fleet_shifts_driverId_idx" ON "fleet_shifts"("driverId");

-- CreateIndex
CREATE INDEX "fleet_shifts_startTime_idx" ON "fleet_shifts"("startTime");

-- CreateIndex
CREATE INDEX "fleet_shifts_status_idx" ON "fleet_shifts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_driverId_key" ON "vehicles"("driverId");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_region_idx" ON "vehicles"("region");

-- CreateIndex
CREATE INDEX "vehicles_driverId_idx" ON "vehicles"("driverId");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_vehicleId_idx" ON "vehicle_maintenance"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_scheduledDate_idx" ON "vehicle_maintenance"("scheduledDate");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_status_idx" ON "vehicle_maintenance"("status");

-- CreateIndex
CREATE INDEX "fleet_routes_driverId_idx" ON "fleet_routes"("driverId");

-- CreateIndex
CREATE INDEX "fleet_routes_status_idx" ON "fleet_routes"("status");

-- CreateIndex
CREATE INDEX "fleet_routes_region_idx" ON "fleet_routes"("region");

-- CreateIndex
CREATE INDEX "route_waypoints_routeId_idx" ON "route_waypoints"("routeId");

-- CreateIndex
CREATE INDEX "route_waypoints_sequence_idx" ON "route_waypoints"("sequence");

-- CreateIndex
CREATE INDEX "fleet_optimizations_type_idx" ON "fleet_optimizations"("type");

-- CreateIndex
CREATE INDEX "fleet_optimizations_region_idx" ON "fleet_optimizations"("region");

-- CreateIndex
CREATE INDEX "fleet_optimizations_applied_idx" ON "fleet_optimizations"("applied");

-- CreateIndex
CREATE INDEX "fleet_route_optimizations_optimizationGoal_idx" ON "fleet_route_optimizations"("optimizationGoal");

-- CreateIndex
CREATE INDEX "fleet_route_optimizations_applied_idx" ON "fleet_route_optimizations"("applied");

-- CreateIndex
CREATE INDEX "fleet_budgets_period_idx" ON "fleet_budgets"("period");

-- CreateIndex
CREATE INDEX "fleet_budgets_category_idx" ON "fleet_budgets"("category");

-- CreateIndex
CREATE INDEX "fleet_budgets_region_idx" ON "fleet_budgets"("region");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_budgets_period_category_region_key" ON "fleet_budgets"("period", "category", "region");

-- CreateIndex
CREATE INDEX "fleet_incidents_type_idx" ON "fleet_incidents"("type");

-- CreateIndex
CREATE INDEX "fleet_incidents_severity_idx" ON "fleet_incidents"("severity");

-- CreateIndex
CREATE INDEX "fleet_incidents_status_idx" ON "fleet_incidents"("status");

-- CreateIndex
CREATE INDEX "fleet_incidents_driverId_idx" ON "fleet_incidents"("driverId");

-- CreateIndex
CREATE INDEX "fleet_incidents_vehicleId_idx" ON "fleet_incidents"("vehicleId");

-- CreateIndex
CREATE INDEX "fleet_incidents_region_idx" ON "fleet_incidents"("region");

-- CreateIndex
CREATE INDEX "performance_alerts_driverId_idx" ON "performance_alerts"("driverId");

-- CreateIndex
CREATE INDEX "performance_alerts_type_idx" ON "performance_alerts"("type");

-- CreateIndex
CREATE INDEX "performance_alerts_acknowledged_idx" ON "performance_alerts"("acknowledged");

-- CreateIndex
CREATE INDEX "performance_alerts_timestamp_idx" ON "performance_alerts"("timestamp");

-- CreateIndex
CREATE INDEX "performance_rewards_driverId_idx" ON "performance_rewards"("driverId");

-- CreateIndex
CREATE INDEX "performance_rewards_type_idx" ON "performance_rewards"("type");

-- CreateIndex
CREATE INDEX "performance_rewards_status_idx" ON "performance_rewards"("status");

-- CreateIndex
CREATE INDEX "assignment_logs_orderId_idx" ON "assignment_logs"("orderId");

-- CreateIndex
CREATE INDEX "assignment_logs_driverId_idx" ON "assignment_logs"("driverId");

-- CreateIndex
CREATE INDEX "assignment_logs_algorithm_idx" ON "assignment_logs"("algorithm");

-- CreateIndex
CREATE INDEX "assignment_logs_createdAt_idx" ON "assignment_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ab_tests_status_idx" ON "ab_tests"("status");

-- CreateIndex
CREATE INDEX "ab_tests_region_idx" ON "ab_tests"("region");

-- CreateIndex
CREATE INDEX "driver_expenses_driverId_idx" ON "driver_expenses"("driverId");

-- CreateIndex
CREATE INDEX "driver_expenses_category_idx" ON "driver_expenses"("category");

-- CreateIndex
CREATE INDEX "driver_expenses_status_idx" ON "driver_expenses"("status");

-- CreateIndex
CREATE INDEX "financial_projections_driverId_idx" ON "financial_projections"("driverId");

-- CreateIndex
CREATE INDEX "financial_projections_period_idx" ON "financial_projections"("period");

-- CreateIndex
CREATE INDEX "tax_deductions_driverId_idx" ON "tax_deductions"("driverId");

-- CreateIndex
CREATE INDEX "tax_deductions_type_idx" ON "tax_deductions"("type");

-- CreateIndex
CREATE INDEX "financial_bonuses_driverId_idx" ON "financial_bonuses"("driverId");

-- CreateIndex
CREATE INDEX "financial_bonuses_bonusType_idx" ON "financial_bonuses"("bonusType");

-- CreateIndex
CREATE INDEX "financial_budgets_driverId_idx" ON "financial_budgets"("driverId");

-- CreateIndex
CREATE INDEX "subscription_features_driverId_idx" ON "subscription_features"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_features_driverId_featureId_key" ON "subscription_features"("driverId", "featureId");

-- CreateIndex
CREATE INDEX "subscription_usage_driverId_idx" ON "subscription_usage"("driverId");

-- CreateIndex
CREATE INDEX "subscription_usage_feature_idx" ON "subscription_usage"("feature");

-- CreateIndex
CREATE INDEX "subscription_analytics_driverId_idx" ON "subscription_analytics"("driverId");

-- CreateIndex
CREATE INDEX "subscription_analytics_period_idx" ON "subscription_analytics"("period");

-- CreateIndex
CREATE INDEX "meta_glasses_sessions_driverId_idx" ON "meta_glasses_sessions"("driverId");

-- CreateIndex
CREATE INDEX "meta_glasses_sessions_deviceId_idx" ON "meta_glasses_sessions"("deviceId");

-- CreateIndex
CREATE INDEX "voice_commands_driverId_idx" ON "voice_commands"("driverId");

-- CreateIndex
CREATE INDEX "voice_commands_executedAt_idx" ON "voice_commands"("executedAt");

-- CreateIndex
CREATE INDEX "qr_scans_driverId_idx" ON "qr_scans"("driverId");

-- CreateIndex
CREATE INDEX "qr_scans_type_idx" ON "qr_scans"("type");

-- CreateIndex
CREATE UNIQUE INDEX "driver_referrals_code_key" ON "driver_referrals"("code");

-- CreateIndex
CREATE INDEX "driver_referrals_referrerId_idx" ON "driver_referrals"("referrerId");

-- CreateIndex
CREATE INDEX "driver_referrals_referredId_idx" ON "driver_referrals"("referredId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_orders_orderId_key" ON "favorite_orders"("orderId");

-- CreateIndex
CREATE INDEX "favorite_orders_driverId_idx" ON "favorite_orders"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_orders_driverId_orderId_key" ON "favorite_orders"("driverId", "orderId");

-- CreateIndex
CREATE INDEX "cross_app_events_type_idx" ON "cross_app_events"("type");

-- CreateIndex
CREATE INDEX "cross_app_events_sourceApp_idx" ON "cross_app_events"("sourceApp");

-- CreateIndex
CREATE INDEX "cross_app_events_timestamp_idx" ON "cross_app_events"("timestamp");

-- CreateIndex
CREATE INDEX "cross_app_events_processed_idx" ON "cross_app_events"("processed");

-- CreateIndex
CREATE INDEX "workflow_events_type_idx" ON "workflow_events"("type");

-- CreateIndex
CREATE INDEX "workflow_events_correlationId_idx" ON "workflow_events"("correlationId");

-- CreateIndex
CREATE INDEX "workflow_events_timestamp_idx" ON "workflow_events"("timestamp");

-- CreateIndex
CREATE INDEX "workflow_events_processed_idx" ON "workflow_events"("processed");

-- CreateIndex
CREATE INDEX "workflow_instances_workflowId_idx" ON "workflow_instances"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");

-- CreateIndex
CREATE INDEX "workflow_instances_startedAt_idx" ON "workflow_instances"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_name_key" ON "workflow_definitions"("name");

-- CreateIndex
CREATE INDEX "workflow_definitions_name_idx" ON "workflow_definitions"("name");

-- CreateIndex
CREATE INDEX "workflow_definitions_isActive_idx" ON "workflow_definitions"("isActive");

-- CreateIndex
CREATE INDEX "orchestration_executions_ruleId_idx" ON "orchestration_executions"("ruleId");

-- CreateIndex
CREATE INDEX "orchestration_executions_eventId_idx" ON "orchestration_executions"("eventId");

-- CreateIndex
CREATE INDEX "orchestration_executions_executedAt_idx" ON "orchestration_executions"("executedAt");

-- CreateIndex
CREATE INDEX "orchestration_executions_success_idx" ON "orchestration_executions"("success");

-- CreateIndex
CREATE INDEX "emergency_incidents_type_idx" ON "emergency_incidents"("type");

-- CreateIndex
CREATE INDEX "emergency_incidents_severity_idx" ON "emergency_incidents"("severity");

-- CreateIndex
CREATE INDEX "emergency_incidents_status_idx" ON "emergency_incidents"("status");

-- CreateIndex
CREATE INDEX "emergency_incidents_createdAt_idx" ON "emergency_incidents"("createdAt");

-- CreateIndex
CREATE INDEX "cross_app_support_tickets_category_idx" ON "cross_app_support_tickets"("category");

-- CreateIndex
CREATE INDEX "cross_app_support_tickets_priority_idx" ON "cross_app_support_tickets"("priority");

-- CreateIndex
CREATE INDEX "cross_app_support_tickets_status_idx" ON "cross_app_support_tickets"("status");

-- CreateIndex
CREATE INDEX "cross_app_support_tickets_customerId_idx" ON "cross_app_support_tickets"("customerId");

-- CreateIndex
CREATE INDEX "cross_app_support_tickets_assignedAgent_idx" ON "cross_app_support_tickets"("assignedAgent");

-- CreateIndex
CREATE INDEX "analytics_reports_type_idx" ON "analytics_reports"("type");

-- CreateIndex
CREATE INDEX "analytics_reports_status_idx" ON "analytics_reports"("status");

-- CreateIndex
CREATE INDEX "analytics_reports_generatedAt_idx" ON "analytics_reports"("generatedAt");

-- CreateIndex
CREATE INDEX "cross_app_customer_feedback_orderId_idx" ON "cross_app_customer_feedback"("orderId");

-- CreateIndex
CREATE INDEX "cross_app_customer_feedback_customerId_idx" ON "cross_app_customer_feedback"("customerId");

-- CreateIndex
CREATE INDEX "cross_app_customer_feedback_restaurantId_idx" ON "cross_app_customer_feedback"("restaurantId");

-- CreateIndex
CREATE INDEX "cross_app_customer_feedback_driverId_idx" ON "cross_app_customer_feedback"("driverId");

-- CreateIndex
CREATE INDEX "cross_app_customer_feedback_sentiment_idx" ON "cross_app_customer_feedback"("sentiment");

-- CreateIndex
CREATE INDEX "cross_app_customer_feedback_status_idx" ON "cross_app_customer_feedback"("status");

-- CreateIndex
CREATE INDEX "quality_investigations_type_idx" ON "quality_investigations"("type");

-- CreateIndex
CREATE INDEX "quality_investigations_severity_idx" ON "quality_investigations"("severity");

-- CreateIndex
CREATE INDEX "quality_investigations_status_idx" ON "quality_investigations"("status");

-- CreateIndex
CREATE INDEX "quality_investigations_assignedTo_idx" ON "quality_investigations"("assignedTo");

-- CreateIndex
CREATE INDEX "sync_states_userId_idx" ON "sync_states"("userId");

-- CreateIndex
CREATE INDEX "sync_states_deviceId_idx" ON "sync_states"("deviceId");

-- CreateIndex
CREATE INDEX "sync_states_lastSyncTimestamp_idx" ON "sync_states"("lastSyncTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_userId_deviceId_key" ON "sync_states"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "sync_queue_userId_deviceId_idx" ON "sync_queue"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "sync_queue_status_idx" ON "sync_queue"("status");

-- CreateIndex
CREATE INDEX "sync_queue_createdAt_idx" ON "sync_queue"("createdAt");

-- CreateIndex
CREATE INDEX "sync_queue_status_createdAt_idx" ON "sync_queue"("status", "createdAt");

-- CreateIndex
CREATE INDEX "sync_conflicts_userId_deviceId_idx" ON "sync_conflicts"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "sync_conflicts_conflictType_idx" ON "sync_conflicts"("conflictType");

-- CreateIndex
CREATE INDEX "sync_conflicts_resolution_idx" ON "sync_conflicts"("resolution");

-- CreateIndex
CREATE INDEX "sync_conflicts_resolvedAt_idx" ON "sync_conflicts"("resolvedAt");

-- CreateIndex
CREATE INDEX "sync_conflicts_userId_deviceId_resolvedAt_idx" ON "sync_conflicts"("userId", "deviceId", "resolvedAt");

-- CreateIndex
CREATE INDEX "restaurant_locations_restaurantId_idx" ON "restaurant_locations"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_locations_isActive_idx" ON "restaurant_locations"("isActive");

-- CreateIndex
CREATE INDEX "supplier_orders_supplierId_idx" ON "supplier_orders"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_orders_restaurantId_idx" ON "supplier_orders"("restaurantId");

-- CreateIndex
CREATE INDEX "supplier_orders_status_idx" ON "supplier_orders"("status");

-- CreateIndex
CREATE INDEX "restaurant_tables_restaurantId_idx" ON "restaurant_tables"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_tables_status_idx" ON "restaurant_tables"("status");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_restaurantId_number_key" ON "restaurant_tables"("restaurantId", "number");

-- CreateIndex
CREATE INDEX "reservations_restaurantId_idx" ON "reservations"("restaurantId");

-- CreateIndex
CREATE INDEX "reservations_tableId_idx" ON "reservations"("tableId");

-- CreateIndex
CREATE INDEX "reservations_reservationTime_idx" ON "reservations"("reservationTime");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "gdpr_requests_driverId_idx" ON "gdpr_requests"("driverId");

-- CreateIndex
CREATE INDEX "gdpr_requests_type_idx" ON "gdpr_requests"("type");

-- CreateIndex
CREATE INDEX "gdpr_requests_status_idx" ON "gdpr_requests"("status");

-- CreateIndex
CREATE INDEX "winback_campaign_logs_driverId_idx" ON "winback_campaign_logs"("driverId");

-- CreateIndex
CREATE INDEX "winback_campaign_logs_campaignId_idx" ON "winback_campaign_logs"("campaignId");

-- CreateIndex
CREATE INDEX "winback_campaign_logs_sentAt_idx" ON "winback_campaign_logs"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_code_idx" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_validUntil_idx" ON "discount_codes"("validUntil");

-- CreateIndex
CREATE INDEX "discount_codes_isActive_idx" ON "discount_codes"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "customer_lifetime_value_driverId_key" ON "customer_lifetime_value"("driverId");

-- CreateIndex
CREATE INDEX "customer_lifetime_value_driverId_idx" ON "customer_lifetime_value"("driverId");

-- CreateIndex
CREATE INDEX "customer_lifetime_value_totalValue_idx" ON "customer_lifetime_value"("totalValue");

-- CreateIndex
CREATE INDEX "customer_lifetime_value_lastCalculated_idx" ON "customer_lifetime_value"("lastCalculated");

-- CreateIndex
CREATE UNIQUE INDEX "churn_predictions_driverId_key" ON "churn_predictions"("driverId");

-- CreateIndex
CREATE INDEX "churn_predictions_driverId_idx" ON "churn_predictions"("driverId");

-- CreateIndex
CREATE INDEX "churn_predictions_churnProbability_idx" ON "churn_predictions"("churnProbability");

-- CreateIndex
CREATE INDEX "churn_predictions_riskLevel_idx" ON "churn_predictions"("riskLevel");

-- CreateIndex
CREATE INDEX "churn_predictions_predictedAt_idx" ON "churn_predictions"("predictedAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_contracts_contractNumber_key" ON "subscription_contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "subscription_contracts_driverId_idx" ON "subscription_contracts"("driverId");

-- CreateIndex
CREATE INDEX "subscription_contracts_subscriptionId_idx" ON "subscription_contracts"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_contracts_contractNumber_idx" ON "subscription_contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "subscription_contracts_status_idx" ON "subscription_contracts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "_FleetRouteToOrder_AB_unique" ON "_FleetRouteToOrder"("A", "B");

-- CreateIndex
CREATE INDEX "_FleetRouteToOrder_B_index" ON "_FleetRouteToOrder"("B");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_fleetZoneId_fkey" FOREIGN KEY ("fleetZoneId") REFERENCES "fleet_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_audit_events" ADD CONSTRAINT "driver_audit_events_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_alerts" ADD CONSTRAINT "restaurant_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_alerts" ADD CONSTRAINT "restaurant_alerts_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_tax_profiles" ADD CONSTRAINT "driver_tax_profiles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tax_profiles" ADD CONSTRAINT "restaurant_tax_profiles_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_reports" ADD CONSTRAINT "tax_reports_driverTaxProfileId_fkey" FOREIGN KEY ("driverTaxProfileId") REFERENCES "driver_tax_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_reports" ADD CONSTRAINT "tax_reports_restaurantTaxProfileId_fkey" FOREIGN KEY ("restaurantTaxProfileId") REFERENCES "restaurant_tax_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_driverTaxProfileId_fkey" FOREIGN KEY ("driverTaxProfileId") REFERENCES "driver_tax_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_restaurantTaxProfileId_fkey" FOREIGN KEY ("restaurantTaxProfileId") REFERENCES "restaurant_tax_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_subscriptions" ADD CONSTRAINT "driver_subscriptions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_transactions" ADD CONSTRAINT "commission_transactions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_transactions" ADD CONSTRAINT "commission_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_transactions" ADD CONSTRAINT "commission_transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "driver_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_points_history" ADD CONSTRAINT "loyalty_points_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_points_history" ADD CONSTRAINT "loyalty_points_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_points_history" ADD CONSTRAINT "loyalty_points_history_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_gamification" ADD CONSTRAINT "customer_gamification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_achievements" ADD CONSTRAINT "customer_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_achievements" ADD CONSTRAINT "customer_achievements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_chef_profiles" ADD CONSTRAINT "customer_chef_profiles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_pages" ADD CONSTRAINT "legal_pages_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_nutrition" ADD CONSTRAINT "dish_nutrition_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_orders" ADD CONSTRAINT "scheduled_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_orders" ADD CONSTRAINT "scheduled_orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_orders" ADD CONSTRAINT "group_orders_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_orders" ADD CONSTRAINT "group_orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_order_members" ADD CONSTRAINT "group_order_members_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_order_members" ADD CONSTRAINT "group_order_members_groupOrderId_fkey" FOREIGN KEY ("groupOrderId") REFERENCES "group_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_order_items" ADD CONSTRAINT "group_order_items_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_order_items" ADD CONSTRAINT "group_order_items_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_order_items" ADD CONSTRAINT "group_order_items_groupOrderId_fkey" FOREIGN KEY ("groupOrderId") REFERENCES "group_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_likes" ADD CONSTRAINT "social_likes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_likes" ADD CONSTRAINT "social_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_follows" ADD CONSTRAINT "social_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_follows" ADD CONSTRAINT "social_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_challenges" ADD CONSTRAINT "social_challenges_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_challenge_participants" ADD CONSTRAINT "social_challenge_participants_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "social_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_challenge_participants" ADD CONSTRAINT "social_challenge_participants_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_bookmarks" ADD CONSTRAINT "social_bookmarks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_bookmarks" ADD CONSTRAINT "social_bookmarks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_hidden_posts" ADD CONSTRAINT "social_hidden_posts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_hidden_posts" ADD CONSTRAINT "social_hidden_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_social_posts" ADD CONSTRAINT "restaurant_social_posts_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_shifts" ADD CONSTRAINT "driver_shifts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whitelabel_configs" ADD CONSTRAINT "whitelabel_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_billing" ADD CONSTRAINT "tenant_billing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ml_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_schedules" ADD CONSTRAINT "driver_schedules_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_carts" ADD CONSTRAINT "saved_carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_dishes" ADD CONSTRAINT "favorite_dishes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_dishes" ADD CONSTRAINT "favorite_dishes_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpfuls" ADD CONSTRAINT "review_helpfuls_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpfuls" ADD CONSTRAINT "review_helpfuls_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_templates" ADD CONSTRAINT "meal_plan_templates_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_delays" ADD CONSTRAINT "order_delays_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_delays" ADD CONSTRAINT "order_delays_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_order_actions" ADD CONSTRAINT "bulk_order_actions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_optimizations" ADD CONSTRAINT "route_optimizations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_histories" ADD CONSTRAINT "route_histories_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_alternatives" ADD CONSTRAINT "route_alternatives_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_performances" ADD CONSTRAINT "driver_performances_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_stats" ADD CONSTRAINT "gamification_stats_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_achievements" ADD CONSTRAINT "gamification_achievements_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_quests" ADD CONSTRAINT "gamification_quests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_scores" ADD CONSTRAINT "safety_scores_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_logs" ADD CONSTRAINT "emergency_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_dispatches" ADD CONSTRAINT "emergency_dispatches_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "emergency_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_responses" ADD CONSTRAINT "emergency_responses_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "emergency_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_incidents" ADD CONSTRAINT "system_incidents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_incidents" ADD CONSTRAINT "system_incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_incident_components" ADD CONSTRAINT "system_incident_components_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "system_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_schedules" ADD CONSTRAINT "fleet_schedules_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "fleet_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_shifts" ADD CONSTRAINT "fleet_shifts_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "fleet_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_shifts" ADD CONSTRAINT "fleet_shifts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_shifts" ADD CONSTRAINT "fleet_shifts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "fleet_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_routes" ADD CONSTRAINT "fleet_routes_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_waypoints" ADD CONSTRAINT "route_waypoints_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "fleet_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_incidents" ADD CONSTRAINT "fleet_incidents_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_incidents" ADD CONSTRAINT "fleet_incidents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_incidents" ADD CONSTRAINT "fleet_incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_alerts" ADD CONSTRAINT "performance_alerts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_rewards" ADD CONSTRAINT "performance_rewards_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_logs" ADD CONSTRAINT "assignment_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_logs" ADD CONSTRAINT "assignment_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_expenses" ADD CONSTRAINT "driver_expenses_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_projections" ADD CONSTRAINT "financial_projections_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_deductions" ADD CONSTRAINT "tax_deductions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_bonuses" ADD CONSTRAINT "financial_bonuses_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_budgets" ADD CONSTRAINT "financial_budgets_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_features" ADD CONSTRAINT "subscription_features_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_analytics" ADD CONSTRAINT "subscription_analytics_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_glasses_sessions" ADD CONSTRAINT "meta_glasses_sessions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_commands" ADD CONSTRAINT "voice_commands_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_referrals" ADD CONSTRAINT "driver_referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_referrals" ADD CONSTRAINT "driver_referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_orders" ADD CONSTRAINT "favorite_orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_orders" ADD CONSTRAINT "favorite_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_locations" ADD CONSTRAINT "restaurant_locations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "_FleetRouteToOrder" ADD CONSTRAINT "_FleetRouteToOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "fleet_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FleetRouteToOrder" ADD CONSTRAINT "_FleetRouteToOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
