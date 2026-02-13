# PR-5 Outbox Pattern Implementation

## Overview
The outbox pattern ensures reliable event publishing by storing events in the same database transaction as business data changes.

## Database Schema
```sql
CREATE TABLE outbox_events (
  id VARCHAR PRIMARY KEY,
  type VARCHAR NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX idx_outbox_pending ON outbox_events(created_at)
WHERE processed_at IS NULL;
```

## Processing Flow
1. **Business Operation**: Order status changes in same TX
2. **Outbox Insert**: Event added to outbox_events table
3. **TX Commit**: Both business data and outbox committed atomically
4. **Background Processor**: Polls for unprocessed events every 5 seconds
5. **Publish to Redis**: Events published to Redis streams
6. **Mark Processed**: Event marked as processed

## Redis Streams
**Stream Format**: `events:{eventType}`
**Example**: `events:order_status_changed`

**Stream Entry**:
```json
{
  "id": "msg_1642780800000_abc123",
  "type": "order_status_changed",
  "payload": "{\"orderId\": \"123\", \"oldStatus\": \"pending\", \"newStatus\": \"accepted\"}",
  "created_at": "2025-12-21T23:00:00.000Z"
}
```

## Retry Logic
- **Max Retries**: 3 attempts
- **Backoff**: Exponential (immediate, 5s, 25s)
- **Dead Letter**: After max retries, marked with error but not deleted

## Statistics Endpoint
**URL**: `/internal/outbox/stats`
**Response**:
```json
{
  "total_messages": 1250,
  "pending_messages": 5,
  "processed_messages": 1245,
  "retried_messages": 12,
  "avg_retry_count": 0.15
}
```

## Test Verification
### ✅ Transaction Atomicity
```sql
-- Start TX
BEGIN;
-- Update order status
UPDATE orders SET status = 'accepted' WHERE id = '123';
-- Insert outbox event
INSERT INTO outbox_events (id, type, payload) VALUES ('msg_123', 'order_status_changed', '{"orderId": "123"}');
COMMIT;
-- Verify both operations succeed or both fail
```

### ✅ Background Processing
- Start with 0 pending messages
- Trigger business operation that adds to outbox
- Verify message appears in Redis stream within 10 seconds
- Check outbox_events.processed_at is set