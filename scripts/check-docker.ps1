# Docker Connectivity Diagnostic for Windows
Write-Host "🐳 Docker Connectivity Diagnostic (Windows)" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check Docker CLI path
Write-Host "🔍 Docker CLI Path:" -ForegroundColor Yellow
try {
    $dockerPath = where.exe docker 2>$null
    if ($dockerPath) {
        Write-Host "  ✅ Found at: $dockerPath" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Docker CLI not found in PATH" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Docker CLI not found in PATH" -ForegroundColor Red
}
Write-Host ""

# Check docker version
Write-Host "🔍 Docker Version:" -ForegroundColor Yellow
try {
    $version = docker version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Docker version OK" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Docker version check failed" -ForegroundColor Red
        Write-Host "    Error: $version" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Docker version check failed" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker appears to be working correctly!" -ForegroundColor Green
} else {
    Write-Host "❌ Docker connectivity issues detected" -ForegroundColor Red
}

Write-Host ""
Write-Host "Script completed" -ForegroundColor Gray