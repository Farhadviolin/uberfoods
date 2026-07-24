CREATE TABLE "audit_ledger" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "audit_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_ledger_created_at_idx" ON "audit_ledger"("created_at");
CREATE INDEX "audit_ledger_actor_id_created_at_idx" ON "audit_ledger"("actor_id", "created_at");
CREATE INDEX "audit_ledger_entity_type_entity_id_idx" ON "audit_ledger"("entity_type", "entity_id");
