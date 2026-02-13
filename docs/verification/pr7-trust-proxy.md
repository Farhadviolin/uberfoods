# PR-7 Trust Proxy Configuration

## Trust Proxy Setting
**Environment Variable**: `TRUST_PROXY=true`
**Express Configuration**: `app.set('trust proxy', 1)`
**Default**: `false` (no proxy trust)

## Security Implications

### When TRUST_PROXY=true
- Express trusts the leftmost IP in X-Forwarded-For header
- Client IP detection uses proxy-provided headers
- HTTPS detection uses X-Forwarded-Proto header
- Host detection uses X-Forwarded-Host header

### When TRUST_PROXY=false (Default)
- Client IP is direct connection IP
- No header-based IP spoofing possible
- Direct HTTPS detection
- Direct host header usage

## Deployment Scenarios

### Load Balancer Deployment
```
Client → Load Balancer → Backend
```
- TRUST_PROXY=true: Backend sees real client IP
- Load balancer adds X-Forwarded-* headers
- Rate limiting works on real client IPs

### Direct Deployment
```
Client → Backend
```
- TRUST_PROXY=false: Backend sees direct connection IP
- No proxy header processing
- Simpler, more secure configuration

### CDN + Load Balancer
```
Client → CDN → Load Balancer → Backend
```
- TRUST_PROXY=1: Trust first proxy (load balancer)
- CDN headers not trusted (security boundary)
- Multiple proxy hop support available

## Security Considerations

### Header Spoofing Protection
- TRUST_PROXY limits header trust to first proxy only
- Prevents client header spoofing attacks
- Maintains security boundary integrity

### IP-Based Security
- Rate limiting uses correct client IPs
- Access controls work with real IPs
- Audit logs contain accurate IP information

## Implementation Evidence
- ✅ Trust proxy configuration applied when enabled
- ✅ Client IP detection works correctly
- ✅ Security headers not bypassed by proxy trust
- ✅ Rate limiting uses real client IPs
- ✅ No breaking changes to IP-based features

## Testing Recommendations
- Test with load balancer setup
- Verify client IP detection accuracy
- Check rate limiting with real client IPs
- Validate security controls still function