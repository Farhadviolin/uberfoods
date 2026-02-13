# E2E Setup Script - idempotent and robust
param()

Write-Host "🚀 Setting up E2E environment..." -ForegroundColor Green

# Function to check if service is ready
function Wait-ForService {
    param(
        [string]$url,
        [int]$timeout = 120,
        [string]$serviceName = "Service"
    )

    $startTime = Get-Date
    Write-Host "⏳ Waiting for $serviceName to be ready at $url..." -NoNewline

    while ($true) {
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host ""
                Write-Host "✅ $serviceName is ready!" -ForegroundColor Green
                return
            }
        }
        catch {
            # Service not ready yet
        }

        $currentTime = Get-Date
        $elapsed = ($currentTime - $startTime).TotalSeconds

        if ($elapsed -ge $timeout) {
            Write-Host ""
            Write-Host "❌ Timeout waiting for $serviceName after ${timeout}s" -ForegroundColor Red
            exit 1
        }

        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
}

# Start Docker containers (idempotent)
Write-Host "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for database to be ready
Wait-ForService -url "http://127.0.0.1:3000/api/health" -timeout 120 -serviceName "Database/Backend"

# Run migrations (idempotent)
Write-Host "🗃️  Running database migrations..."
try {
    docker-compose exec -T backend npx prisma migrate deploy
} catch {
    Write-Host "Migration might have already been applied or failed (continuing...)" -ForegroundColor Yellow
}

# Run seed (idempotent)
Write-Host "🌱 Seeding database..."
try {
    docker-compose exec -T backend npm run prisma:seed
} catch {
    Write-Host "Seed might have already been applied or failed (continuing...)" -ForegroundColor Yellow
}

# Final health check
Wait-ForService -url "http://127.0.0.1:3000/api/health" -timeout 30 -serviceName "Backend after seeding"

Write-Host "🎉 E2E environment is ready!" -ForegroundColor Green
