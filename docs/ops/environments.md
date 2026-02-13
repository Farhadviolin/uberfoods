# UberFoods Environment Matrix

## Environment Overview

### Local Development
**Purpose**: Individual developer workstations
**Infrastructure**: Docker Compose (local containers)
**Data**: Ephemeral, seeded test data
**Access**: Localhost only
**Compliance**: Development standards only

### Staging
**Purpose**: Pre-production testing and validation
**Infrastructure**: Cloud deployment (AWS ECS/EKS)
**Data**: Production-like data (anonymized)
**Access**: Restricted IP ranges, VPN required
**Compliance**: Full security controls, audit logging

### Production
**Purpose**: Live customer traffic
**Infrastructure**: Cloud deployment (AWS ECS/EKS) with multi-AZ
**Data**: Real customer data
**Access**: Public APIs, internal admin restricted
**Compliance**: Full regulatory compliance (GDPR, SOX, PCI)

## Configuration Matrix

### Environment Variables by Environment

| Variable | Local | Staging | Production | Description |
|----------|-------|---------|------------|-------------|
| NODE_ENV | development | staging | production | Node.js environment |
| REGION | local | eu-central-1 | eu-central-1 | Deployment region |
| ROLE | primary | primary | primary | Instance role |
| LOG_LEVEL | debug | info | warn | Application logging level |
| DATABASE_URL | postgres://... | postgres://... | postgres://... | Database connection |
| REDIS_URL | redis://... | redis://... | redis://... | Redis connection |
| JWT_SECRET | dev-secret | [vault] | [vault] | JWT signing secret |
| API_BASE_URL | http://localhost:3000/api | https://api.staging.uberfoods.com | https://api.uberfoods.com | API base URL |

### Feature Flags by Environment

| Feature Flag | Local | Staging | Production | Description |
|--------------|-------|---------|------------|-------------|
| FEATURE_SECURITY_HEADERS | false | true | true | Security headers enabled |
| CSP_REPORT_ONLY | true | true | false | CSP report-only mode |
| FEATURE_STRICT_VALIDATION | false | true | true | Strict input validation |
| FEATURE_REQUIRE_ADMIN_AUTH | false | true | true | Admin auth required |
| FEATURE_WRITE_GUARD | false | false | true | Write restrictions in secondary regions |
| FEATURE_REQUIRE_TENANT_FILTER | false | true | true | Tenant filtering enforced |
| FEATURE_DUAL_PUBLISH | false | false | true | Dual-region event publishing |
| ARCHIVE_ENC_KEY | [unset] | [vault] | [vault] | Archive encryption key |

### Resource Limits by Environment

| Resource | Local | Staging | Production | Unit |
|----------|-------|---------|------------|------|
| CPU | 1 | 2 | 4-8 | vCPU |
| Memory | 2GB | 4GB | 8-16GB | RAM |
| Database CPU | 1 | 2 | 4-8 | vCPU |
| Database Memory | 2GB | 4GB | 8-16GB | RAM |
| Redis Memory | 256MB | 1GB | 4-8GB | RAM |

## Data Management

### Data Residency
- **EU Data**: Stored in EU-West (Ireland/Frankfurt)
- **Backup Location**: Cross-region backup in EU-North
- **Disaster Recovery**: EU-North failover region

### Data Retention
- **Customer Data**: 7 years (GDPR requirement)
- **Audit Logs**: 7 years (compliance requirement)
- **Application Logs**: 90 days
- **Metrics Data**: 1 year

### Backup Strategy
- **Frequency**: Daily full backup + hourly WAL
- **Retention**: 30 days hot backup, 1 year cold storage
- **Encryption**: AES-256 at rest
- **Testing**: Monthly restore testing

## Security Controls by Environment

### Authentication & Authorization
- **Local**: Basic auth, no MFA
- **Staging**: Full auth, MFA optional
- **Production**: Full auth, MFA required

### Network Security
- **Local**: Open network access
- **Staging**: VPC with security groups
- **Production**: VPC with security groups + WAF

### Monitoring & Alerting
- **Local**: Basic logging
- **Staging**: Full monitoring, warnings only
- **Production**: Full monitoring, critical alerts

## Compliance Requirements

### GDPR Compliance
- **Data Processing**: Lawful basis documented
- **Data Subject Rights**: Automated fulfillment
- **Breach Notification**: <72 hours
- **Data Protection Officer**: Designated contact

### Security Standards
- **ISO 27001**: Information security management
- **SOC 2**: Trust services criteria
- **PCI DSS**: Payment card data security (if applicable)

### Audit Requirements
- **Access Logging**: All data access logged
- **Change Management**: All changes auditable
- **Incident Response**: 24/7 response capability
- **Penetration Testing**: Annual external testing