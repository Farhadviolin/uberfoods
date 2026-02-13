# Release Gate - Customer E2E Quality Assurance
# Minimal orchestration - delegates all logic to specialized CI scripts

param(
    [switch]$SkipE2E = $false,
    [string]$Platform = "auto"  # auto, windows, linux
)

$ErrorActionPreference = "Stop"

# Determine platform
if ($Platform -eq "auto") {
    if ($PSVersionTable.Platform -eq "Win32NT" -or $PSVersionTable.PSEdition -eq "Desktop") {
        $Platform = "windows"
    } else {
        $Platform = "linux"
    }
}

Write-Host "=== Release Gate: Customer E2E Quality Assurance ===" -ForegroundColor Cyan
Write-Host "Platform: $Platform" -ForegroundColor Gray
Write-Host "Skip E2E: $SkipE2E" -ForegroundColor Gray

if ($SkipE2E) {
    Write-Host "⚠️  E2E tests skipped via -SkipE2E flag" -ForegroundColor Yellow
    exit 0
}

# Validate prerequisites
$scriptRoot = Split-Path -Parent $PSScriptRoot
Set-Location $scriptRoot

if ($Platform -eq "windows") {
    $ciScript = Join-Path $PSScriptRoot "run-customer-e2e-ci.ps1"

    if (-not (Test-Path $ciScript)) {
        Write-Host "❌ Windows CI script not found: $ciScript" -ForegroundColor Red
        exit 1
    }

    Write-Host "🚀 Running Customer E2E on Windows..." -ForegroundColor Green
    & $ciScript

} elseif ($Platform -eq "linux") {
    $ciScript = Join-Path $PSScriptRoot "run-customer-e2e-ci.sh"

    if (-not (Test-Path $ciScript)) {
        Write-Host "❌ Linux CI script not found: $ciScript" -ForegroundColor Red
        exit 1
    }

    # Ensure executable
    if ($PSVersionTable.Platform -ne "Win32NT") {
        & chmod +x $ciScript
    }

    Write-Host "🚀 Running Customer E2E on Linux..." -ForegroundColor Green
    & $ciScript

} else {
    Write-Host "❌ Unsupported platform: $Platform" -ForegroundColor Red
    Write-Host "Supported: windows, linux, auto" -ForegroundColor Yellow
    exit 1
}

$exitCode = $LASTEXITCODE
Write-Host "=== Release Gate Complete ===" -ForegroundColor Cyan
$exitColor = if ($exitCode -eq 0) { "Green" } else { "Red" }
Write-Host "Exit Code: $exitCode" -ForegroundColor $exitColor

exit $exitCode