# Prisma Duplicate ScheduledTask Model Analysis

## Root Cause Identified
**Issue**: Duplicate model definition "ScheduledTask" in schema.prisma
**Location 1**: Line 2045 (canonical model)
**Location 2**: Line 3770 (duplicate/incorrect model)

## Model Comparison

### Model 1 (Line 2045) - CANONICAL
```prisma
model ScheduledTask {
  id        String    @id @default(cuid())
  name      String
  schedule  String
  status    String    @default("ACTIVE")
  lastRun   DateTime?
  nextRun   DateTime?
  config    Json?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([status])
  @@index([nextRun])
  @@map("scheduled_tasks")
}
```

### Model 2 (Line 3770) - DUPLICATE/INCORRECT
```prisma
model ScheduledTask {
  id          String   @id @default(cuid())
  type        String // GDPR_DATA_DELETION, WINBACK_CAMPAIGN, etc.
  targetId    String // driverId or other target identifier
  scheduledFor DateTime
  executedAt  DateTime?
  status      String   @default("PENDING") // PENDING, EXECUTED, FAILED
  data        Json? // Additional task data
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type])
  @@index([targetId])
  @@index([scheduledFor])
  @@index([status])
  @@map("scheduled_tasks")  // SAME TABLE NAME!
}
```

## Migration Evidence
**Migration**: `20251118152553_add_password_change_tracking/migration.sql`
**Table Structure**: Matches Model 1 exactly
```
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
```

## Decision: Remove Model 2
**Reasoning**:
1. **Database Schema**: Migration creates table matching Model 1
2. **Purpose**: Model 1 is for general scheduled tasks (name, schedule, config)
3. **Model 2**: Appears to be task execution logs, not scheduled tasks
4. **Conflict**: Both models map to same table "scheduled_tasks"

**Action**: Remove Model 2 (lines 3770-3787) from schema.prisma
**Alternative Name**: If Model 2 functionality needed, rename to `TaskExecution` or `ScheduledTaskExecution`

## Code References Check
**Status**: No code references found to either ScheduledTask model
**Implication**: Safe to remove Model 2 without breaking changes

## Implementation Plan
1. Remove Model 2 from schema.prisma (lines 3770-3787)
2. Run `npx prisma validate` to confirm no conflicts
3. Run `npx prisma generate` to regenerate client
4. Rebuild container and test NestJS startup

---

*Generated: $(date)*