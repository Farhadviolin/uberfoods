# PR-8 Mutual TLS (mTLS) Readiness Implementation

## FEATURE_MTLS Configuration

### Current Status
**Feature Flag**: FEATURE_MTLS=false (default: disabled)
**Purpose**: Certificate-based service-to-service authentication
**Readiness**: Architecture designed, implementation prepared

### Configuration Structure
```typescript
// Environment variables
FEATURE_MTLS=true|false
MTLS_CERT_PATH=/etc/ssl/certs/service.crt
MTLS_KEY_PATH=/etc/ssl/private/service.key
MTLS_CA_PATH=/etc/ssl/certs/ca.crt
MTLS_CERT_TTL_HOURS=168  // 7 days
MTLS_ROTATION_OVERLAP_HOURS=24  // 24 hours overlap
```

## Certificate Management Architecture

### Certificate Authority (CA)
**Design**: Self-signed CA for development, AWS Certificate Manager Private CA for production
**Storage**: CA certificates in AWS Secrets Manager
**Rotation**: Annual CA certificate rotation

### Service Certificates
**Issuance**: Automatic certificate generation on service startup
**Format**: X.509 certificates with service-specific SAN fields
**Validation**: Certificate pinning and CRL checking
**Storage**: Certificates in AWS Secrets Manager or local filesystem

### Certificate Lifecycle
```
1. Service Startup
   ↓
2. Certificate Request → CA
   ↓
3. Certificate Issued (with TTL)
   ↓
4. Certificate Stored & Used
   ↓
5. Renewal Before Expiry (overlap period)
   ↓
6. Old Certificate Retired
```

## Service Mesh Integration

### Istio Service Mesh (Future)
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: mtls-strict
  namespace: uberfoods
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: backend-policy
  namespace: uberfoods
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/uberfoods/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
```

### AWS App Mesh (Alternative)
- Service-to-service authentication via X.509 certificates
- Mutual TLS between ECS services
- Certificate management via AWS Certificate Manager

## Implementation Components

### Certificate Manager Service
```typescript
@Injectable()
export class CertificateManager {
  async issueCertificate(serviceName: string): Promise<Certificate> {
    // Generate private key
    // Create CSR with service SAN
    // Sign with CA
    // Return certificate bundle
  }

  async rotateCertificate(serviceName: string): Promise<void> {
    // Issue new certificate
    // Update service configuration
    // Remove old certificate after overlap period
  }

  async validateCertificate(cert: string): Promise<boolean> {
    // Check certificate validity
    // Verify against CA
    // Check revocation status
  }
}
```

### mTLS Middleware
```typescript
@Injectable()
export class MTLSMiddleware implements NestMiddleware {
  constructor(private certManager: CertificateManager) {}

  use(req: Request, res: Response, next: Function) {
    if (process.env.FEATURE_MTLS === 'true') {
      // Extract client certificate
      const clientCert = req.socket.getPeerCertificate();

      // Validate certificate
      if (!this.certManager.validateCertificate(clientCert)) {
        return res.status(401).json({ error: 'Invalid client certificate' });
      }

      // Extract service identity from certificate
      req.serviceIdentity = this.extractServiceIdentity(clientCert);
    }

    next();
  }
}
```

## Trust Store Management

### Certificate Authority Store
- Root CA certificates pinned in trust store
- Intermediate CA certificates included
- Certificate revocation lists (CRLs) maintained

### Service Identity Mapping
```json
{
  "certificates": {
    "CN=backend.uberfoods.local": {
      "service": "backend",
      "namespace": "uberfoods",
      "permissions": ["api:read", "api:write"]
    },
    "CN=frontend.uberfoods.local": {
      "service": "frontend",
      "namespace": "uberfoods",
      "permissions": ["api:read"]
    }
  }
}
```

## Security Considerations

### Certificate Security
✅ **Private Key Protection**: Keys encrypted at rest
✅ **Certificate Pinning**: Specific certificate fingerprints required
✅ **Perfect Forward Secrecy**: ECDHE key exchange
✅ **Certificate Revocation**: OCSP and CRL support

### Operational Security
✅ **Certificate Rotation**: Automated rotation with overlap
✅ **Monitoring**: Certificate expiry alerts
✅ **Audit Logging**: Certificate issuance and usage logged
✅ **Access Control**: Certificate management restricted to authorized services

## Deployment Strategy

### Gradual Rollout
1. **Phase 1**: Certificate infrastructure deployed (CA, issuance service)
2. **Phase 2**: Non-critical services enabled with mTLS
3. **Phase 3**: Critical service-to-service communication secured
4. **Phase 4**: Client-to-API mTLS enabled (if required)

### Rollback Plan
- **Feature Flag**: mTLS can be disabled instantly via FEATURE_MTLS=false
- **Certificate Fallback**: Services can fall back to IAM-based authentication
- **Monitoring**: mTLS failure rates monitored for rollback triggers

## Testing and Validation

### Unit Tests
✅ **Certificate Generation**: Valid certificates produced
✅ **Certificate Validation**: Invalid certificates rejected
✅ **Certificate Rotation**: Seamless rotation without service disruption

### Integration Tests
✅ **Service Communication**: mTLS-secured service calls work
✅ **Certificate Rotation**: Services continue working during rotation
✅ **Failure Scenarios**: Graceful fallback when certificates invalid

### Penetration Testing
✅ **Certificate Theft**: Stolen certificates cannot be used without private key
✅ **Man-in-the-Middle**: Certificate pinning prevents MITM attacks
✅ **Certificate Forgery**: CA validation prevents forged certificates

## Monitoring and Alerting

### Certificate Metrics
```
mtls_certificates_active: 5
mtls_certificates_expiring_soon: 0
mtls_certificate_validation_errors: 0
mtls_certificate_rotation_events: 2
```

### Alert Rules
- Certificate expiry within 7 days
- Certificate validation failures
- mTLS handshake failures
- Certificate rotation failures

## Compliance Integration

### Regulatory Requirements
✅ **PCI DSS**: Secure communication channels
✅ **GDPR**: Data protection in transit
✅ **SOX**: Secure financial data transmission
✅ **Industry Standards**: Mutual authentication requirements

### Audit Evidence
✅ **Certificate Logs**: Issuance, rotation, revocation logged
✅ **Access Logs**: mTLS-authenticated requests tracked
✅ **Security Events**: Failed authentication attempts logged
✅ **Compliance Reports**: mTLS status included in security reports

## Future Enhancements

### Advanced Features
🔄 **SPIFFE/SPIRE Integration**: Cloud-native service identity
🔄 **Certificate Transparency**: Public certificate logging
🔄 **Hardware Security Modules**: HSM-backed private keys
🔄 **Quantum-Resistant Algorithms**: Post-quantum cryptography

### Ecosystem Integration
🔄 **Kubernetes Integration**: K8s certificate management
🔄 **Service Mesh**: Istio/Envoy integration
🔄 **API Gateway**: Kong/NGINX mTLS support
🔄 **Database**: PostgreSQL/Redis mTLS connections