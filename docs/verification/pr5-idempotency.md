# PR-5 Idempotency Implementation

## Overview
Idempotency prevents duplicate processing of the same request, ensuring that retrying failed operations doesn't cause unintended side effects.

## Implementation Details
**Header**: `Idempotency-Key` (UUID format required)
**Storage**: Redis with TTL (24 hours default)
**Scope**: Applied to write operations (PATCH /orders/:id/status)

## Usage Example
```bash
curl -X PATCH http://localhost:3000/api/orders/123/status \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 123e4567-e89b-12d3-a456-426614174000" \
  -d '{"status": "accepted"}'
```

## Response Caching
- **Success Responses (2xx)**: Cached with full response body and headers
- **Error Responses**: Not cached (allows retries after fixes)
- **TTL**: 24 hours (configurable per operation)

## Test Scenarios
### ✅ Duplicate Request Returns Same Result
```bash
# First request
curl -X PATCH /api/orders/123/status -H "Idempotency-Key: abc-123" -d '{"status": "accepted"}'
# Returns: {"orderId": "123", "status": "accepted", "updatedAt": "2025-12-21T23:00:00Z"}

# Duplicate request (same key)
curl -X PATCH /api/orders/123/status -H "Idempotency-Key: abc-123" -d '{"status": "accepted"}'
# Returns: {"orderId": "123", "status": "accepted", "updatedAt": "2025-12-21T23:00:00Z"} (identical)
```

### ✅ Different Key Processes Normally
```bash
# Different key = new operation
curl -X PATCH /api/orders/123/status -H "Idempotency-Key: def-456" -d '{"status": "delivered"}'
# Returns: {"orderId": "123", "status": "delivered", "updatedAt": "2025-12-21T23:01:00Z"}
```

## Edge Cases Handled
- **Missing Key**: 400 Bad Request
- **Invalid Format**: 400 Bad Request
- **Expired Key**: Treated as new request
- **Concurrent Requests**: First wins, others get cached response
- **Redis Failure**: Fail-open (allows operation to proceed)