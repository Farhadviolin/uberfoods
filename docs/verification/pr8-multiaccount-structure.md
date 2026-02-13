# PR-8 Multi-Account Architecture Structure

## AWS Organization Structure

### Root Organization
```
UberFoods Organization (r-123456)
├── Security Account (123456789012)
├── Shared Services Account (123456789013)
├── Staging Account (123456789014)
└── Production Account (123456789015)
```

## Account Purposes

### Security Account (security/)
**Purpose**: Centralized security tooling and compliance monitoring
**Resources**:
- AWS Security Hub (master account)
- AWS GuardDuty (master account)
- AWS Config (aggregated configuration)
- AWS CloudTrail (organization trail)
- AWS Access Analyzer
- Security incident response tools

**Access**: Restricted to security team only

### Shared Services Account (shared/)
**Purpose**: Common infrastructure shared across environments
**Resources**:
- Route 53 hosted zones (uberfoods.com)
- AWS Certificate Manager certificates
- AWS Secrets Manager (cross-account secrets)
- AWS Systems Manager Parameter Store
- Centralized logging (CloudWatch Logs)
- Backup vaults

**Access**: Development and operations teams

### Staging Account (staging/)
**Purpose**: Pre-production environment for testing
**Resources**:
- Full application stack (ECS, RDS, Redis)
- Staging-specific databases and caches
- Load testing infrastructure
- Development and QA access

**Access**: Development, QA, and operations teams

### Production Account (prod/)
**Purpose**: Live customer environment
**Resources**:
- Production application stack
- Production databases and caches
- Customer-facing load balancers
- WAF and security controls
- Monitoring and alerting

**Access**: Operations team only (break-glass access for developers)

## Cross-Account IAM Roles

### Organization-Level Roles
```hcl
# Security Read-Only Access
resource "aws_iam_role" "security_readonly" {
  name = "SecurityReadOnlyAccess"
  assume_role_policy = data.aws_iam_policy_document.assume_from_security_account.json
}

# Operations Admin Access
resource "aws_iam_role" "operations_admin" {
  name = "OperationsAdminAccess"
  assume_role_policy = data.aws_iam_policy_document.assume_from_security_account.json
}
```

### Service Control Policies (SCPs)

#### Deny Root Access
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": {
        "AWS": "arn:aws:iam::*:root"
      },
      "Action": "*",
      "Resource": "*"
    }
  ]
}
```

#### Require Encryption
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "*",
      "Condition": {
        "Null": {
          "s3:x-amz-server-side-encryption": "true"
        }
      }
    }
  ]
}
```

#### Restrict Regions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["eu-west-1", "eu-central-1"]
        }
      }
    }
  ]
}
```

## Network Architecture

### Transit Gateway
- Centralized network connectivity between accounts
- Shared services accessible from all accounts
- Security inspection at network boundaries

### VPC Design per Account
```
Security Account:
├── Security VPC (10.10.0.0/16)
│   ├── Public Subnet (10.10.1.0/24)
│   └── Private Subnet (10.10.101.0/24)

Shared Services:
├── Shared VPC (10.20.0.0/16)
│   ├── Public Subnet (10.20.1.0/24)
│   └── Private Subnet (10.20.101.0/24)

Staging:
├── Staging VPC (10.30.0.0/16)
│   ├── Public Subnets (10.30.1.0/24, 10.30.2.0/24)
│   └── Private Subnets (10.30.101.0/24, 10.30.102.0/24)

Production:
├── Production VPC (10.40.0.0/16)
│   ├── Public Subnets (10.40.1.0/24, 10.40.2.0/24)
│   └── Private Subnets (10.40.101.0/24, 10.40.102.0/24)
```

## Resource Sharing

### AWS Resource Access Manager (RAM)
- Shared subnets for cross-account access
- Transit Gateway sharing
- Certificate sharing from Shared Services

### Cross-Account Resource Access
```hcl
# Allow Staging to access Shared Services certificates
resource "aws_ram_resource_share" "certificates" {
  name                      = "certificate-share"
  allow_external_principals = false

  resource_arns = [
    aws_acm_certificate.wildcard.arn
  ]
}
```

## Cost Management

### Cost Allocation Tags
- Account-level cost allocation
- Environment tagging for all resources
- Cost center tagging for chargeback

### Budgets and Alerts
- Account-level budgets
- Cost anomaly detection
- Monthly cost reports

## Access Management

### Identity Center (AWS SSO)
- Centralized user access management
- Permission sets for different roles
- MFA enforcement

### Permission Sets
- **Developer**: Read-only access to staging, limited production access
- **Operations**: Full access to staging and production
- **Security**: Read-only access to all accounts
- **Billing**: Cost and billing access only

## Monitoring and Compliance

### CloudTrail Organization Trail
- All API calls across all accounts logged
- Logs stored in Security account
- Retention: 7 years for compliance

### Config Aggregator
- Multi-account configuration compliance
- Centralized Config rules
- Automated remediation where possible

### Security Hub
- Consolidated security findings
- Cross-account insights
- Automated response actions

## Disaster Recovery

### Cross-Region Capabilities
- Primary: eu-west-1 (Ireland)
- DR: eu-central-1 (Frankfurt)
- Data replication between regions
- DNS failover capabilities

### Backup Strategy
- Cross-account backup copies
- Immutable backups in Security account
- Automated testing of restore procedures

## Implementation Status

### ✅ Completed
- Account structure designed
- IAM roles and SCPs defined
- Network architecture planned
- Resource sharing configured
- Cost management implemented
- Access controls established

### 🔄 In Progress
- CloudTrail organization trail setup
- Config aggregator configuration
- Security Hub master account setup
- Cross-region replication testing

### 🔄 Planned
- Automated account provisioning
- Self-service account creation
- Enhanced monitoring dashboards
- Compliance automation workflows