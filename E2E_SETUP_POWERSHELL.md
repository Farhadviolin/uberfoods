# E2E Testing Setup - Windows PowerShell

## Database Reset for E2E Tests

The E2E database reset includes safety measures to prevent accidental production database operations.

### Prerequisites
1. E2E database container is running:
   ```powershell
   docker compose -f docker/e2e/docker-compose.e2e.yml up -d
   ```

### Running Database Reset

#### Option 1: Set environment variable for session
```powershell
# Set consent environment variable
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to the database reset operation for E2E testing"

# Run database reset
node scripts/reset-db-e2e.mjs
```

#### Option 2: Set environment variable inline
```powershell
# Run with inline environment variable
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to the database reset operation for E2E testing"; node scripts/reset-db-e2e.mjs
```

### Running Full Release Gate

#### Option 1: Set environment variable for session
```powershell
# Set consent environment variable
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to the database reset operation for E2E testing"

# Run full release gate (build + tests + E2E)
node scripts/release-gate.mjs
```

#### Option 2: Set environment variable inline
```powershell
# Run with inline environment variable
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to the database reset operation for E2E testing"; node scripts/release-gate.mjs
```

## Safety Features

The scripts include multiple safety measures:

1. **Database Target Validation**: Ensures DATABASE_URL targets E2E environment by checking:
   - Port 5433
   - Host containing "postgres_e2e" or "e2e"
   - Database name containing "e2e" or "test"
   - NODE_ENV/APP_ENV = "e2e"

2. **Prisma AI Consent**: Requires explicit consent for dangerous operations when invoked by AI agents.

3. **Non-Interactive Mode**: Release gate automatically inherits consent from environment variables.

## Troubleshooting

### "Database safety check failed"
- Verify `.env.e2e` contains correct DATABASE_URL
- Ensure E2E database container is running on expected port/host
- Check NODE_ENV or APP_ENV is set to "e2e"

### "Prisma AI safety consent required"
- Set the `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` environment variable
- Use the exact PowerShell commands shown above

### Database connection issues
- Ensure E2E container is healthy: `docker compose -f docker/e2e/docker-compose.e2e.yml ps`
- Check container logs: `docker compose -f docker/e2e/docker-compose.e2e.yml logs postgres-e2e`
