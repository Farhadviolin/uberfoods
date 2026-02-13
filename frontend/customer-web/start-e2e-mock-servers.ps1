# PowerShell Script to start E2E servers with Mock backend
Write-Host "Starting E2E Servers with MOCK backend..." -ForegroundColor Green

# Start Mock Server
Write-Host "Starting Mock Server on port 3001..." -ForegroundColor Yellow
$mockJob = Start-Job -ScriptBlock {
    Set-Location "PROJECT_ROOT_PLACEHOLDER"
    & node mock-server.js
}

# Wait for mock server to be ready
Start-Sleep -Seconds 5
$mockReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:3001/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Mock Server ready!" -ForegroundColor Green
            $mockReady = $true
            break
        }
    } catch {
        Write-Host "Waiting for Mock Server... ($i/30)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $mockReady) {
    Write-Host "Mock Server failed to start!" -ForegroundColor Red
    exit 1
}

# Start Customer Web DEV Server with E2E_MOCK=true
Write-Host "Starting Customer Web DEV Server on port 3102 (with mocks)..." -ForegroundColor Yellow
$webJob = Start-Job -ScriptBlock {
    Set-Location "PROJECT_ROOT_PLACEHOLDER\frontend\customer-web"
    $env:VITE_E2E_MOCK = "true"
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

# Test proxy with mock server
Write-Host "Testing proxy with mock backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3102/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "Proxy working with MOCK backend! All servers ready." -ForegroundColor Green
        Write-Host "MOCK MODE: Using mock responses instead of real backend" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop servers" -ForegroundColor Cyan

        # Keep script running to maintain servers
        try {
            while ($true) {
                Start-Sleep -Seconds 1
            }
        } finally {
            Write-Host "Stopping servers..." -ForegroundColor Yellow
            Stop-Job $mockJob -ErrorAction SilentlyContinue
            Stop-Job $webJob -ErrorAction SilentlyContinue
            Remove-Job $mockJob -ErrorAction SilentlyContinue
            Remove-Job $webJob -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Host "Proxy test failed!" -ForegroundColor Red
    exit 1
}