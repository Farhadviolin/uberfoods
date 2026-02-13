# E2E Setup Runner - Cross-platform compatibility fix
# Runs all E2E setup scripts from correct working directories

$ErrorActionPreference = "Stop"

function Run-FromRepoRoot {
    param([string]$ScriptPath, [string]$Description)

    Write-Host "🔧 $Description" -ForegroundColor Cyan
    $scriptDir = Split-Path -Parent $PSScriptRoot
    Set-Location $scriptDir

    try {
        & node $ScriptPath 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Script failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-Host "❌ $Description failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# 1. Reset/Seed Database
Run-FromRepoRoot "scripts/reset-db-e2e.mjs" "Resetting E2E Database"

# 2. Test Customer Login
Run-FromRepoRoot "scripts/test-customer-login.mjs" "Testing Customer Login"

Write-Host "✅ E2E Setup Complete" -ForegroundColor Green