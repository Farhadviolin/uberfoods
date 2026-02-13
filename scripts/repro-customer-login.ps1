# Customer Login Repro Script with Debug Logging
# Reproduces E2E customer login issue with full debug output

param(
    [string]$BackendLog = "$PSScriptRoot\..\artifacts\e2e-customer\backend-e2e-live.log",
    [int]$HealthTimeout = 30,
    [int]$LoginTimeout = 15
)

# Ensure artifacts directory exists
$artifactsDir = Split-Path $BackendLog -Parent
if (!(Test-Path $artifactsDir)) {
    New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
}

# Set E2E debug environment
$env:E2E_AUTH_DEBUG = "true"
$env:NODE_ENV = "e2e"

Write-Host "🔧 Starting Customer Login Repro with Debug Logging..." -ForegroundColor Cyan
Write-Host "Backend log: $BackendLog" -ForegroundColor Gray
Write-Host "E2E_AUTH_DEBUG: $env:E2E_AUTH_DEBUG" -ForegroundColor Gray

# Start backend in background and capture logs
Write-Host "🚀 Starting Backend E2E..." -ForegroundColor Yellow

$backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start:e2e" -WorkingDirectory "$PSScriptRoot\..\backend" -NoNewWindow -RedirectStandardOutput $BackendLog -RedirectStandardError "$BackendLog.error" -PassThru

# Wait for backend to start (health check)
Write-Host "⏳ Waiting for Backend Health Check..." -ForegroundColor Yellow
$healthUrl = "http://localhost:3000/api/metrics/health"
$healthOk = $false
$attempts = 0

while (!$healthOk -and $attempts -lt $HealthTimeout) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $healthOk = $true
            Write-Host "✅ Backend Health Check PASSED" -ForegroundColor Green
        }
    } catch {
        $attempts++
        Write-Host "⏳ Health check attempt $attempts/$HealthTimeout failed, waiting..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (!$healthOk) {
    Write-Host "❌ Backend Health Check FAILED after $HealthTimeout seconds" -ForegroundColor Red
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# Run customer login test
Write-Host "🔐 Running Customer Login Test..." -ForegroundColor Yellow

$loginProcess = Start-Process -FilePath "node" -ArgumentList "scripts/test-customer-login.mjs" -WorkingDirectory "$PSScriptRoot\.." -NoNewWindow -Wait -PassThru

$loginExitCode = $loginProcess.ExitCode

if ($loginExitCode -eq 0) {
    Write-Host "✅ Customer Login Test PASSED (Exit 0)" -ForegroundColor Green
} else {
    Write-Host "❌ Customer Login Test FAILED (Exit $loginExitCode)" -ForegroundColor Red
}

# Stop backend
Write-Host "🛑 Stopping Backend..." -ForegroundColor Yellow
Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue

# Show relevant log snippets
Write-Host "`n📋 Backend Debug Logs (validateUser related):" -ForegroundColor Cyan
if (Test-Path $BackendLog) {
    $logContent = Get-Content $BackendLog -Raw
    $validateUserLogs = $logContent | Select-String "\[E2E-AUTH\]" | Select-Object -First 20
    if ($validateUserLogs) {
        $validateUserLogs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Host "  No [E2E-AUTH] logs found in backend output" -ForegroundColor Yellow
    }
}

Write-Host "Repro Complete - Check artifacts folder for logs" -ForegroundColor Cyan

exit $loginExitCode