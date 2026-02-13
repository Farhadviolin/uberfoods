# PR-6 Region Configuration Implementation

## Environment Variables
**REGION**: Region identifier (default: "local")
**ROLE**: Instance role - "primary", "secondary", or "canary" (default: "primary")
**DATACENTER**: Data center identifier (default: "local-dc")
**FEATURE_WRITE_GUARD**: Enable write restrictions for secondary regions (default: "false")

## Region Configuration Structure
```typescript
interface RegionConfig {
  region: string;
  role: 'primary' | 'secondary' | 'canary';
  datacenter: string;
  environment: string;
  writeGuardEnabled: boolean;
}
```

## Write Permissions Logic
- **Primary**: Always accepts writes
- **Secondary**: Accepts writes only if FEATURE_WRITE_GUARD=false
- **Canary**: Accepts writes only in non-production environments

## Example Configurations
**Local Development**:
```
REGION=local
ROLE=primary
DATACENTER=local-dc
FEATURE_WRITE_GUARD=false
```

**EU Primary**:
```
REGION=eu-central-1
ROLE=primary
DATACENTER=frankfurt
FEATURE_WRITE_GUARD=false
```

**US Secondary**:
```
REGION=us-east-1
ROLE=secondary
DATACENTER=virginia
FEATURE_WRITE_GUARD=true
```

## Startup Banner
Application logs region information on startup:
```
🚀 UberFoods Backend v1.0.0
📍 Region: eu-central-1 (primary)
🏢 Data Center: frankfurt
🌍 Environment: production
✍️ Write Operations: enabled
```