# SSM/Secrets Manager Parameterkonzept

Phase 1 benötigt alle sensiblen Werte aus SSM Parameter Store (oder Secrets Manager). Empfohlene Struktur je Umgebung (`staging`, `prod`):

```
/uberfoods/{env}/db_password
/uberfoods/{env}/redis_auth_token
/uberfoods/{env}/jwt_secret
/uberfoods/{env}/stripe_secret_key
/uberfoods/{env}/sentry_dsn
/uberfoods/{env}/maps_api_key
/uberfoods/{env}/sendgrid_api_key   # oder SES Credentials
/uberfoods/{env}/vapid_public_key
/uberfoods/{env}/vapid_private_key
/uberfoods/{env}/backend_env        # optional JSON für weitere Variablen
```

Anlegen (Beispiel):
```bash
aws ssm put-parameter --name "/uberfoods/staging/db_password" --type SecureString --value "REPLACE" --region eu-central-1
aws ssm put-parameter --name "/uberfoods/staging/redis_auth_token" --type SecureString --value "REPLACE" --region eu-central-1
aws ssm put-parameter --name "/uberfoods/staging/jwt_secret" --type SecureString --value "REPLACE" --region eu-central-1
aws ssm put-parameter --name "/uberfoods/staging/stripe_secret_key" --type SecureString --value "REPLACE" --region eu-central-1
aws ssm put-parameter --name "/uberfoods/staging/sentry_dsn" --type SecureString --value "REPLACE" --region eu-central-1
```

IAM Zugriff:
- ECS Task Role (aws_iam_role.ecs_task) hat `ssm:GetParameter`/`secretsmanager:GetSecretValue`.
- In `ecs-services.tf` werden Secrets per `secrets`-Block referenziert.

Hinweis:
- DB/Redis URLs werden zusammengesetzt: Passwort/Auth-Token kommen aus SSM, Host/Port aus Terraform Outputs (RDS/Redis).
- Für Frontends werden API-URLs/CDN-URLs als Build-Env in CI gesetzt (siehe deploy-aws Workflow).
