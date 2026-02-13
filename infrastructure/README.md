# UberFoods Infrastructure as Code

## Overview
This directory contains the Infrastructure as Code (IaC) definitions for deploying UberFoods across multiple environments using Terraform.

## Structure

```
infrastructure/
├── README.md                    # This file
├── live/                        # Environment-specific configurations
│   ├── dev/                    # Development environment
│   ├── staging/                # Staging environment
│   └── prod/                   # Production environment
├── modules/                    # Reusable Terraform modules
│   ├── network/               # VPC, subnets, security groups
│   ├── ecs/                   # ECS cluster, services, tasks
│   ├── rds/                   # PostgreSQL database
│   ├── redis/                 # ElastiCache Redis
│   ├── observability/         # CloudWatch, monitoring
│   ├── iam/                   # IAM roles and policies
│   ├── security/              # Security groups, KMS
│   └── waf/                   # WAF rules and protections
└── policy/                    # Policy as Code (OPA)
    └── conftest/
```

## Prerequisites

### Required Tools
- **Terraform**: v1.5.0+
- **AWS CLI**: v2.x
- **Terragrunt**: Optional, for enhanced environment management

### AWS Permissions
The following IAM permissions are required:
- `iam:*` (for IAM role/service creation)
- `ec2:*` (for VPC/networking)
- `ecs:*` (for container services)
- `rds:*` (for database)
- `elasticache:*` (for Redis)
- `wafv2:*` (for Web Application Firewall)
- `kms:*` (for encryption keys)

## Quick Start

### 1. Authentication
```bash
aws configure sso
# or
aws configure
```

### 2. Initialize Terraform
```bash
cd infrastructure/live/dev
terraform init
```

### 3. Plan Deployment
```bash
terraform plan
```

### 4. Apply Changes
```bash
terraform apply
```

## Environments

### Development (dev/)
- Single AZ deployment
- Minimal resource sizing
- Cost-optimized configuration
- Full access for development

### Staging (staging/)
- Multi-AZ deployment
- Production-like configuration
- Restricted access (VPN required)
- Full security controls enabled

### Production (prod/)
- Multi-AZ deployment
- Maximum availability and security
- Least privilege access
- Full compliance and audit logging

## Modules

### Network Module
- VPC with public/private subnets
- Internet Gateway and NAT Gateways
- Security groups for each service
- Route tables and network ACLs

### ECS Module
- ECS cluster with Fargate capacity
- Application Load Balancer
- Target groups and listener rules
- CloudWatch log groups

### RDS Module
- PostgreSQL database instance
- Multi-AZ configuration (production)
- Automated backups and maintenance
- Security groups and parameter groups

### Redis Module
- ElastiCache Redis cluster
- Multi-AZ configuration (production)
- Security groups and parameter groups
- Backup and maintenance windows

### Security Module
- KMS keys for encryption
- Security groups
- IAM roles with least privilege
- Resource policies

### WAF Module
- AWS WAF v2 WebACL
- Managed rules (OWASP, bot control)
- Rate limiting rules
- Geographic restrictions

## Security Guardrails

### Mandatory Tags
All resources must include:
```hcl
tags = {
  Environment = var.environment
  Project     = "uberfoods"
  Owner       = var.owner
  CostCenter  = var.cost_center
  Compliance  = "gdpr-pci"
}
```

### Encryption at Rest
- RDS: AES-256 encryption with KMS
- Redis: Encryption in transit and at rest
- S3: Server-side encryption with KMS
- EBS: Encrypted volumes

### Network Security
- No public IPs on database/cache instances
- Security groups restrict access by source
- VPC endpoints for AWS services
- No 0.0.0.0/0 inbound rules

### Access Control
- IAM roles with least privilege
- No hardcoded credentials
- Secrets managed via AWS Secrets Manager
- MFA required for console access

## Multi-Account Architecture

### Account Structure
- **Security Account**: Centralized security tooling and logging
- **Shared Services**: Common services (DNS, certificates, monitoring)
- **Staging**: Pre-production environment
- **Production**: Live customer environment

### Cross-Account Access
- IAM roles for cross-account access
- Service Control Policies (SCPs) for governance
- Resource sharing via AWS RAM
- Centralized billing and cost management

## Deployment Process

### CI/CD Integration
1. **Pull Request**: Terraform validate and plan
2. **Merge**: Automated deployment to dev
3. **Promotion**: Manual approval for staging
4. **Release**: Automated deployment to prod

### Validation Checks
- `terraform validate`: Syntax and structure validation
- `terraform plan`: Change preview and security checks
- `checkov`: Infrastructure security scanning
- `terraform-compliance`: Policy compliance checking

## Monitoring and Alerting

### CloudWatch Integration
- Resource metrics and alarms
- Application performance monitoring
- Security event logging
- Cost and usage monitoring

### Alert Categories
- **Critical**: Service unavailable, security breaches
- **Warning**: Performance degradation, resource limits
- **Info**: Configuration changes, deployments

## Disaster Recovery

### Backup Strategy
- RDS: Automated daily backups, point-in-time recovery
- Redis: Automated snapshots, cross-region replication
- Infrastructure: Terraform state backups

### Recovery Procedures
- **RTO**: <4 hours for critical infrastructure
- **RPO**: <1 hour data loss for databases
- **Testing**: Quarterly disaster recovery drills

## Cost Optimization

### Resource Sizing
- Development: Minimal resources, on-demand pricing
- Staging: Production sizing, reserved instances
- Production: Auto-scaling, spot instances where safe

### Cost Monitoring
- AWS Cost Explorer integration
- Budget alerts and notifications
- Resource tagging for cost allocation
- Regular cost optimization reviews

## Contributing

### Code Standards
- Use Terraform 1.5+ syntax
- Follow AWS and HashiCorp best practices
- Include comprehensive documentation
- Use consistent naming conventions

### Testing
- Unit tests for complex logic
- Integration tests for end-to-end validation
- Security testing with automated tools
- Performance testing for scaling scenarios

### Review Process
- All changes require code review
- Security review for IAM and network changes
- Architecture review for major changes
- Automated validation before merge