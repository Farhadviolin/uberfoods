# PowerShell Script to run E2E tests with deterministic server startup
Write-Host "Starting E2E Test Run with Deterministic Servers..." -ForegroundColor Green

# Start servers in background
Write-Host "Starting servers..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    Set-Location "PROJECT_ROOT_PLACEHOLDER\frontend\customer-web"
    & powershell -ExecutionPolicy Bypass -File start-e2e-servers.ps1
}

# Wait for servers to be ready
Start-Sleep -Seconds 30

# Check if servers are ready
$backendReady = $false
$webReady = $false

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $backendReady = $true
        Write-Host "Backend confirmed ready" -ForegroundColor Green
    }
} catch {
    Write-Host "Backend not ready!" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3102/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $webReady = $true
        Write-Host "Customer Web confirmed ready" -ForegroundColor Green
    }
} catch {
    Write-Host "Customer Web not ready!" -ForegroundColor Red
}

if (-not ($backendReady -and $webReady)) {
    Write-Host "Servers not ready, aborting tests" -ForegroundColor Red
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    exit 1
}

# Run the actual tests
Write-Host "Running Playwright tests..." -ForegroundColor Green
try {
    & npm run test:e2e -- --project=customer-auth
    $exitCode = $LASTEXITCODE
} finally {
    # Cleanup
    Write-Host "Cleaning up servers..." -ForegroundColor Yellow
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
}

exit $exitCode