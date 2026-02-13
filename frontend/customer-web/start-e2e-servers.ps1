# PowerShell Script to start E2E servers deterministically
Write-Host "Starting E2E Servers..." -ForegroundColor Green

# Start Backend E2E Server
Write-Host "Starting Backend E2E Server on port 3000..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "PROJECT_ROOT_PLACEHOLDER\backend"
    & npx ts-node --project tsconfig.build.json src/main.e2e.ts
}

# Wait for backend to be ready
Start-Sleep -Seconds 10
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend ready!" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Write-Host "Waiting for backend... ($i/30)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "Backend failed to start!" -ForegroundColor Red
    exit 1
}

# Start Customer Web DEV Server
Write-Host "Starting Customer Web DEV Server on port 3102..." -ForegroundColor Yellow
$webJob = Start-Job -ScriptBlock {
    Set-Location "PROJECT_ROOT_PLACEHOLDER\frontend\customer-web"
    & npm run dev:e2e
}

# Wait for web server to be ready
Start-Sleep -Seconds 10
$webReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:3102" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Customer Web ready!" -ForegroundColor Green
            $webReady = $true
            break
        }
    } catch {
        Write-Host "Waiting for Customer Web... ($i/30)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $webReady) {
    Write-Host "Customer Web failed to start!" -ForegroundColor Red
    exit 1
}

# Test proxy
Write-Host "Testing proxy..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3102/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "Proxy working! All servers ready." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop servers" -ForegroundColor Cyan

        # Keep script running to maintain servers
        try {
            while ($true) {
                Start-Sleep -Seconds 1
            }
        } finally {
            Write-Host "Stopping servers..." -ForegroundColor Yellow
            Stop-Job $backendJob -ErrorAction SilentlyContinue
            Stop-Job $webJob -ErrorAction SilentlyContinue
            Remove-Job $backendJob -ErrorAction SilentlyContinue
            Remove-Job $webJob -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Host "Proxy test failed!" -ForegroundColor Red
    exit 1
}