# PR-5 HTTP Rate Limiting Implementation

## Rate Limit Configuration
**IP-based**: 100 requests per minute
**User-based**: 500 requests per minute (when authenticated)
**Algorithm**: Sliding window using Redis sorted sets
**Storage**: Redis (distributed, survives restarts)

## Headers Returned
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1734829200
X-RateLimit-Type: ip
Retry-After: 0
```

## 429 Response Example
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1734829200
X-RateLimit-Type: ip
Retry-After: 45
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Too many requests",
  "retryAfter": 45
}
```

## Test Verification
### ✅ Rate Limit Headers Present
```bash
curl -i http://localhost:3000/api/orders
# Should include X-RateLimit-* headers
```

### ✅ 429 Response on Limit Exceeded
```bash
# Send 101 requests rapidly to trigger limit
for i in {1..101}; do
  curl -s http://localhost:3000/api/orders > /dev/null &
done
wait

# Next request should return 429
curl -i http://localhost:3000/api/orders
# Should return HTTP 429 with Retry-After header
```

### ✅ Different Limits for IP vs User
- **IP limit**: More restrictive (100/min) for DDoS protection
- **User limit**: More generous (500/min) for authenticated users
- **Fallback**: Uses IP limit if user not authenticated

## Redis Storage Details
**Key Format**: `ratelimit:http:{type}:{identifier}:{window}`
**Example**: `ratelimit:http:ip:192.168.1.100:1734829200`
**TTL**: Automatic cleanup after window expires
**Memory Usage**: Minimal (one sorted set per active window)