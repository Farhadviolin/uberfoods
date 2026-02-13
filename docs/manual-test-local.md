# Manual Testing on Localhost

This guide provides step-by-step instructions for setting up and running manual tests on localhost after passing the release gate.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- PowerShell (Windows) or Bash (Mac/Linux)

## Docker Preflight (Windows)

Before starting any Docker operations, verify Docker connectivity:

```powershell
# PowerShell (Windows)
.\scripts\check-docker.ps1
```

This script checks:
- Docker CLI installation and path
- Docker daemon connectivity
- Docker Compose availability
- Docker service status (if applicable)
- User group membership (docker-users)
- Environment variables

**Note**: Release-gate will stop early with detailed troubleshooting guidance if Docker is not reachable.

## 1. Setup E2E Database

Start the E2E PostgreSQL database:

```powershell
# PowerShell (Windows)
docker compose -f docker-compose.e2e.yml up -d
```

Verify it's running:
```powershell
docker ps | findstr postgres
```

Expected output should show `uberfoods-postgres-e2e` container.

## 2. Configure Environment

Copy the E2E environment template:

```powershell
# PowerShell (Windows)
Copy-Item .env.e2e.example -Destination backend/.env.e2e
```

The E2E environment points to:
- **Database**: `postgresql://uberfoods:uberfoods@localhost:5433/uberfoods_e2e`
- **Backend Port**: 3000

## 3. Run Release Gate (Database Setup)

Execute the release gate with explicit consent:

```powershell
# PowerShell (Windows)
.\scripts\run-release-gate.ps1
```

**Important**: You will be prompted to type the exact consent phrase:
```
I explicitly consent to the database reset operation for E2E testing
```

This will:
- Reset the E2E database (DROP/RECREATE/SEED)
- Run backend build + tests
- Run frontend builds
- Execute Playwright E2E tests (10 consecutive runs)

## 4. Start Services for Manual Testing

After release gate passes, start the services:

### Backend API
```powershell
cd backend
npm run start:e2e
```

### Frontend Applications

Start each frontend in separate PowerShell terminals:

#### Customer Web (Port 3001)
```powershell
cd frontend/customer-web
npm run dev:e2e
```

#### Admin Panel (Port 3002)
```powershell
cd frontend/admin-panel
npm run dev:e2e
```

#### Restaurant Web (Port 3003)
```powershell
cd frontend/restaurant-web
npm run dev:e2e
```

#### Driver App (Port 3004)
```powershell
cd frontend/driver-app
npm run dev:e2e
```

## 5. Access Applications

Once all services are running, access the applications at:

| Application | URL | Test Credentials |
|-------------|-----|------------------|
| **Backend API** | http://localhost:3000 | - |
| **API Docs** | http://localhost:3000/api/docs | - |
| **Customer Web** | http://localhost:3001 | customer@uberfoods.com / Customer123! |
| **Admin Panel** | http://localhost:3002 | admin@uberfoods.com / Admin123! |
| **Restaurant Web** | http://localhost:3003 | restaurant@uberfoods.com / Restaurant123! |
| **Driver App** | http://localhost:3004 | driver@uberfoods.com / Driver123! |

## 6. Health Checks

Verify services are healthy:

```powershell
# Backend health
curl http://localhost:3000/api/health

# Database connection (via backend)
curl http://localhost:3000/api/drivers/orders/available
```

## 7. Cleanup

Stop all services when done:

```powershell
# Stop databases
docker compose -f docker-compose.e2e.yml down

# Kill Node.js processes (if needed)
Get-Process node | Stop-Process -Force
```

## Troubleshooting

### Database Connection Issues
- Ensure E2E Postgres is running: `docker ps`
- Check DATABASE_URL in `backend/.env.e2e`
- Verify port 5433 is not blocked

### Frontend Connection Issues
- Ensure backend is running on port 3000
- Check Vite proxy configuration in each frontend's `vite.config.ts`
- Verify no port conflicts

### Release Gate Failures
- Check that you typed the exact consent phrase
- Ensure `backend/.env.e2e` exists with correct DATABASE_URL
- Review release gate logs for specific errors

## Notes

- All services use the same E2E database with test data
- Frontend applications proxy API calls to the backend
- WebSocket connections are handled through the backend
- This setup is for manual testing only - not for production use
