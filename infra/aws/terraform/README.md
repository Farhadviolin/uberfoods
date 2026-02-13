# Terraform AWS (Staging & Production)

Diese Konfiguration stellt die Phase‑1‑Ziele bereit:
- VPC mit Public/Private Subnets, NAT, SGs
- ECS/Fargate Cluster + Service für das Backend (ALB, HTTPS, AutoScaling-ready)
- ECR Repositories
- RDS Postgres + ElastiCache Redis (TLS, Auth)
- S3 Buckets für Frontends & Media + CloudFront Distributions
- Route53 Records (ALB + CloudFront)

## Voraussetzungen
- Terraform >= 1.6
- AWS CLI mit Rechten für VPC/ECS/ECR/RDS/ElastiCache/S3/CloudFront/Route53/IAM/ACM
- SSM Parameter für Passwörter/Secrets (siehe Variablen)
- Vorhandene ACM-Zertifikate (api = eu-central-1, Frontends = us-east-1)

## Struktur
- `providers.tf` / `variables.tf` / `main.tf` / `database.tf` / `redis.tf` / `ecs-services.tf` / `s3-cloudfront.tf` / `dns-acm.tf` / `outputs.tf`
- `envs/staging.tfvars` und `envs/prod.tfvars` als Beispielwerte/Platzhalter

## Nutzung
```bash
cd infra/aws/terraform

# Init mit Remote State (z.B. S3 + DynamoDB für Locks) ergänzen
terraform init

# Plan Staging
terraform plan -var-file=envs/staging.tfvars

# Apply Staging
terraform apply -var-file=envs/staging.tfvars

# Plan Prod
terraform plan -var-file=envs/prod.tfvars
```

## Wichtige Variablen/Secrets
- `db_password_ssm_parameter`: SSM Parameter mit DB Passwort
- `redis_auth_token_ssm_parameter`: SSM Parameter mit Redis Auth Token
- Weitere Secrets (JWT, Stripe, Sentry, etc.) werden als SSM Parameter im Pfad `/uberfoods/{env}/...` erwartet und im Task-Def referenziert.

## Hinweise
- ALB terminates TLS für das Backend (Port 443), leitet HTTP -> HTTPS.
- CloudFront nutzt S3 als Origin für alle Frontends (SPA 404->200 Mapping).
- RDS/Redis sind nicht öffentlich erreichbar; nur ECS Security Group hat Zugriff.
- Löschen in Prod ist durch Deletion Protection auf RDS verhindert; Snapshots empfohlen.
