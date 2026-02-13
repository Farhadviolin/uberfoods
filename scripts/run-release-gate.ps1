# PowerShell wrapper for release-gate.mjs with explicit E2E consent
# Ensures deterministic and safe E2E database setup on Windows

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\scripts\run-release-gate.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script provides explicit consent for Prisma AI database operations" -ForegroundColor White
    Write-Host "and runs the release gate with proper E2E environment setup." -ForegroundColor White
    Write-Host ""
    Write-Host "Prerequisites:" -ForegroundColor Yellow
    Write-Host "  - E2E Postgres running: docker compose -f docker-compose.e2e.yml up -d" -ForegroundColor White
    Write-Host "  - E2E env file: Copy .env.e2e.example to backend/.env.e2e" -ForegroundColor White
    Write-Host ""
    exit 0
}

Write-Host "🔒 UberFoods E2E Release Gate Runner" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
Write-Host ""

# Display what will happen
Write-Host "⚠️  This will perform the following operations:" -ForegroundColor Yellow
Write-Host "   1. DROP ALL TABLES in the E2E database" -ForegroundColor Red
Write-Host "   2. Recreate database schema from migrations" -ForegroundColor Red
Write-Host "   3. Seed with test data" -ForegroundColor Red
Write-Host "   4. Run backend build + tests" -ForegroundColor White
Write-Host "   5. Run all frontend builds" -ForegroundColor White
Write-Host "   6. Execute Playwright E2E tests (10 consecutive runs)" -ForegroundColor White
Write-Host ""

# Show current DATABASE_URL (if set)
if ($env:DATABASE_URL) {
    $maskedUrl = $env:DATABASE_URL -replace ':[^:]+@', ':***@'
    Write-Host "📊 Current DATABASE_URL: $maskedUrl" -ForegroundColor Cyan
} else {
    Write-Host "📊 DATABASE_URL not set in environment" -ForegroundColor Yellow
    Write-Host "   Make sure backend/.env.e2e exists with correct DATABASE_URL" -ForegroundColor Yellow
}
Write-Host ""

# Prompt for explicit consent (or auto-consent for automation)
$expectedConsent = "I explicitly consent to the database reset operation for E2E testing"

if ($env:AUTO_CONSENT_RELEASE_GATE -eq "true") {
    Write-Host "🤖 Auto-consent mode enabled" -ForegroundColor Cyan
    $userConsent = $expectedConsent
} else {
    Write-Host "🔑 To proceed, type exactly:" -ForegroundColor Green
    Write-Host "   '$expectedConsent'" -ForegroundColor White
    Write-Host ""

    $userConsent = Read-Host "Your consent"
}

if ($userConsent -ne $expectedConsent) {
    Write-Host ""
    Write-Host "❌ Consent mismatch! Operation cancelled." -ForegroundColor Red
    Write-Host "   You must type the exact consent phrase to proceed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Consent validated. Proceeding with E2E release gate..." -ForegroundColor Green
Write-Host ""

# Check Docker connectivity with auto-start for Windows
Write-Host "🔍 Checking Docker connectivity..." -ForegroundColor Cyan

# Function to check if Docker daemon is available
function Test-DockerDaemon {
    try {
        $dockerInfo = docker info 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# Function to start Docker Desktop on Windows
function Start-DockerDesktop {
    Write-Host "🐳 Attempting to start Docker Desktop..." -ForegroundColor Yellow

    # Common Docker Desktop installation paths
    $dockerPaths = @(
        "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${Env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$Env:LocalAppData\Programs\Docker\Docker\Docker Desktop.exe",
        "$Env:AppData\Docker\Docker Desktop.exe"
    )

    $dockerExe = $null
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            $dockerExe = $path
            break
        }
    }

    if (-not $dockerExe) {
        Write-Host "❌ Docker Desktop executable not found in common locations" -ForegroundColor Red
        Write-Host "   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        return $false
    }

    Write-Host "📍 Found Docker Desktop at: $dockerExe" -ForegroundColor Cyan

    try {
        # Start Docker Desktop
        Start-Process -FilePath $dockerExe -NoNewWindow

        Write-Host "⏳ Waiting for Docker Desktop to initialize (this may take 30-60 seconds)..." -ForegroundColor Yellow

        # Wait up to 120 seconds for Docker daemon to become available
        $maxWaitTime = 120
        $waitInterval = 2
        $elapsed = 0

        while ($elapsed -lt $maxWaitTime) {
            if (Test-DockerDaemon) {
                Write-Host "✅ Docker daemon is now available!" -ForegroundColor Green
                # Give it a few more seconds to fully stabilize
                Start-Sleep -Seconds 5
                return $true
            }

            Write-Host "   Waiting... ($elapsed/$maxWaitTime seconds)" -ForegroundColor Gray
            Start-Sleep -Seconds $waitInterval
            $elapsed += $waitInterval
        }

        Write-Host "❌ Docker daemon did not become available within $maxWaitTime seconds" -ForegroundColor Red
        return $false

    } catch {
        Write-Host "❌ Failed to start Docker Desktop: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Check if Docker CLI is available
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "docker command not found"
    }
    Write-Host "✅ Docker CLI available" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Docker CLI not found in PATH" -ForegroundColor Red
    Write-Host "   Install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
try {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose not available"
    }
    Write-Host "✅ Docker Compose available" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Docker Compose not available" -ForegroundColor Red
    Write-Host "   Docker Compose v2 should be included with Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check if Docker daemon is reachable
if (-not (Test-DockerDaemon)) {
    Write-Host "🔍 Docker daemon not reachable, attempting auto-start..." -ForegroundColor Yellow

    if (-not (Start-DockerDesktop)) {
        Write-Host ""
        Write-Host "❌ Could not start Docker daemon automatically" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔧 MANUAL START:" -ForegroundColor Yellow
        Write-Host "   1. Launch Docker Desktop application manually" -ForegroundColor White
        Write-Host "   2. Wait for 'Docker Desktop is running' message" -ForegroundColor White
        Write-Host "   3. Re-run this script" -ForegroundColor White
        Write-Host ""
        Write-Host "🔍 To verify manually:" -ForegroundColor Cyan
        Write-Host "   docker info" -ForegroundColor White
        Write-Host "   docker compose version" -ForegroundColor White
        exit 1
    }

    Write-Host "✅ Docker daemon reachable" -ForegroundColor Green

Write-Host "✅ Docker connectivity OK" -ForegroundColor Green

Write-Host ""

# Run the release gate with explicit environment variable
try {
    # Change to the correct directory and run the script
    Push-Location (Split-Path $MyInvocation.MyCommand.Path -Parent)
    Push-Location ".."

    # Pass the consent as environment variable to node process
    $consentEnv = "PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=$expectedConsent"
    $env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = $expectedConsent
    & cmd /c "set $consentEnv && node scripts/release-gate.mjs"
    $exitCode = $LASTEXITCODE

    Pop-Location
    Pop-Location

    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "✅ Release gate completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Release gate failed with exit code: $exitCode" -ForegroundColor Red
    }

    exit $exitCode
} catch {
    Write-Host ""
    Write-Host "❌ Error running release gate: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}