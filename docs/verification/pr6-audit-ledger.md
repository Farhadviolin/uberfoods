# PR-6 Audit Ledger Implementation

## Database Schema
```sql
CREATE TABLE audit_ledger (
  id VARCHAR PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  actor_type VARCHAR NOT NULL CHECK (actor_type IN ('user', 'system', 'api')),
  actor_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  payload JSONB NOT NULL,
  prev_hash VARCHAR NOT NULL,
  hash VARCHAR NOT NULL
);

-- Index for efficient chain verification
CREATE INDEX idx_audit_ledger_created_at ON audit_ledger(created_at ASC);
CREATE INDEX idx_audit_ledger_entity ON audit_ledger(entity_type, entity_id);
```

## Hash Chaining Algorithm
**Genesis Block**: `prev_hash = 'genesis'`
**Hash Calculation**: `SHA256(prev_hash + canonical_payload + metadata)`
**Canonical Payload**: Sorted JSON keys, sensitive data redacted

## Audit Entry Structure
```json
{
  "id": "audit_1642780800000_abc123",
  "createdAt": "2025-12-21T23:30:00.000Z",
  "actorType": "user",
  "actorId": "user_123",
  "action": "order.status_changed",
  "entityType": "order",
  "entityId": "order_456",
  "payload": {
    "oldStatus": "pending",
    "newStatus": "accepted",
    "reason": "restaurant_approved"
  },
  "prevHash": "a1b2c3d4...",
  "hash": "e5f6g7h8..."
}
```

## GDPR Compliance
**Data Minimization**:
- Sensitive fields automatically redacted: `password`, `email`, `phone`, `address.*`, `firstName`, `lastName`
- Only operational data retained: IDs, status changes, timestamps
- No personal data in audit trail

**Retention Policy**:
- Configurable via `AUDIT_RETENTION_DAYS` (default: 2555 days = 7 years)
- Automatic cleanup of old entries
- Legal hold capability via `LEGAL_HOLD=true`

## Usage Examples
```typescript
// Order status change
await auditLedger.appendEntry(
  'user',
  userId,
  'order.status_changed',
  'order',
  orderId,
  {
    oldStatus: 'pending',
    newStatus: 'accepted',
    restaurantId: restaurantId
  }
);

// Sensitive data automatically redacted in stored payload
```

## Chain Verification
**Command**: `npm run audit:verify-chain`
**Output**:
```json
{
  "valid": true,
  "totalEntries": 1250,
  "corruptedEntries": [],
  "lastVerifiedEntry": "audit_1642780800000_xyz789"
}
```

## Tamper Detection
**Scenario**: Someone modifies a payload
**Detection**: Hash verification fails for modified entry and all subsequent entries
**Alert**: Automatic detection with detailed logging

## Performance Characteristics
- **Write Overhead**: ~5-10ms per audit entry
- **Storage**: ~1KB per entry (compressed JSON)
- **Query Performance**: Chain verification scales linearly with entry count
- **Retention**: Configurable cleanup prevents unbounded growth