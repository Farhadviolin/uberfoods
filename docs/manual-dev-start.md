# Manual Development Environment Setup

This guide explains how to use the `scripts/dev-manual.ps1` PowerShell script to start the complete UberFoods development environment for manual testing.

## Quick Start

### Basic Usage (with E2E database)

```powershell
.\scripts\dev-manual.ps1
```

This will:
- Start the E2E Docker database on port 5433
- Launch 5 PowerShell windows with all services running

### With Database Reset

```powershell
.\scripts\dev-manual.ps1 -ResetDb
```

This will:
- Reset the database with test data
- Start the E2E Docker database
- Launch all services

### Without E2E Database

```powershell
.\scripts\dev-manual.ps1 -UseE2EDb:$false
```

This assumes you have a database running elsewhere.

## What It Does

The script starts the following services in separate PowerShell windows:

| Service | Command | URL |
|---------|---------|-----|
| Backend | `pnpm --filter backend start:dev` | http://localhost:3000 |
| Admin Panel | `pnpm --filter admin-panel dev` | http://localhost:3002 |
| Customer Web | `pnpm --filter customer-web dev` | http://localhost:3102 |
| Restaurant Web | `pnpm --filter restaurant-web dev` | http://localhost:3003 |
| Driver App | `pnpm --filter driver-app dev` | http://localhost:3004 |

## Prerequisites

- **Windows PowerShell 5.1+**
- **pnpm** package manager
- **Node.js** (matching project requirements)
- **Docker Desktop** (if using E2E database)

## Parameters

- `-ResetDb`: Resets the database with test data (requires explicit consent)
- `-UseE2EDb`: Uses Docker E2E database (default: true)

## Troubleshooting

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use`

**Solution**:
1. Close existing dev servers
2. Kill processes on the conflicting ports:
   ```powershell
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```
3. Or use different ports in package.json if needed

### Docker Not Running

**Problem**: `Docker is not running`

**Solution**:
1. Start Docker Desktop
2. Wait for Docker to fully start (whale icon in system tray)
3. Run the script again

### pnpm Missing

**Problem**: `'pnpm' is not recognized`

**Solution**:
1. Install pnpm globally: `npm install -g pnpm`
2. Or use npm/npx instead (modify the script)

### Node Version Issues

**Problem**: Node.js version conflicts

**Solution**:
1. Check required Node version in `.nvmrc` or `package.json`
2. Use nvm-windows to switch versions:
   ```powershell
   nvm list
   nvm use <version>
   ```

### Database Connection Issues

**Problem**: Services can't connect to database

**Solution**:
1. Check if Docker database is running: `docker ps`
2. Check database logs: `docker logs uberfoods_postgres_e2e`
3. Verify connection string in `.env.e2e`

### Prisma AI Consent Required

**Problem**: Database reset fails with AI consent error

**Solution**: The script handles this automatically, but if running manually:

```powershell
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to the database reset operation for E2E testing"
node scripts/reset-db-e2e.mjs
```

### Services Fail to Start

**Problem**: One or more services don't start

**Solution**:
1. Check the PowerShell window for error messages
2. Verify package.json scripts exist
3. Check if ports are available
4. Try starting individual services manually:
   ```powershell
   cd frontend/admin-panel
   pnpm dev
   ```

## Stopping Services

- Close the PowerShell windows that were opened
- Or press `Ctrl+C` in each window
- To stop Docker database: `docker compose -f docker/e2e/docker-compose.e2e.yml down`

## File Structure

```
scripts/
  dev-manual.ps1          # Main script
  reset-db-e2e.mjs        # Database reset script
  _lib/
    paths.mjs            # Path utilities

docs/
  manual-dev-start.md     # This documentation

docker/e2e/
  docker-compose.e2e.yml  # E2E database config
```