# Simple Customer Login Repro Script

# Set debug env
$env:E2E_AUTH_DEBUG = "true"

# Start backend
Write-Host "Starting backend..."
$backend = Start-Process -FilePath "npm" -ArgumentList "run", "start:e2e" -WorkingDirectory "$PSScriptRoot\..\backend" -NoNewWindow -PassThru

# Wait for health
Start-Sleep -Seconds 5

# Test login
Write-Host "Testing login..."
$login = Start-Process -FilePath "node" -ArgumentList "scripts/test-customer-login.mjs" -WorkingDirectory "$PSScriptRoot\.." -NoNewWindow -Wait -PassThru

# Stop backend
Stop-Process -Id $backend.Id -Force

Write-Host "Exit code: $($login.ExitCode)"
exit $login.ExitCode