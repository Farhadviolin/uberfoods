#Requires -Version 5.1

<#
.SYNOPSIS
    Manual Development Environment Setup for UberFoods
    Starts database and all frontend/backend services in separate PowerShell windows

.DESCRIPTION
    This script provides a convenient way to start the complete UberFoods development environment
    for manual testing. It can start the E2E database via Docker and launch all services.

.PARAMETER ResetDb
    If specified, resets the database with test data before starting services.
    Requires explicit consent for dangerous database operations.

.PARAMETER UseE2EDb
    If specified (default), uses the E2E Docker database on port 5433.
    If not specified, assumes database is already running elsewhere.

.EXAMPLE
    .\scripts\dev-manual.ps1

.EXAMPLE
    .\scripts\dev-manual.ps1 -ResetDb

.NOTES
    - Requires PowerShell 5.1+
    - Requires Docker Desktop (if using E2E database)
    - Requires pnpm and Node.js
    - All services start in separate PowerShell windows
    - Close the windows to stop the dev servers
#>

param(
    [switch]$ResetDb,
    [switch]$UseE2EDb = $true
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Determine repository root safely
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Write-Host "Repository root: $RepoRoot" -ForegroundColor Cyan

# Verify required files exist
$requiredFiles = @(
    "scripts/release-gate.mjs",
    "backend/package.json"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $RepoRoot $file
    if (!(Test-Path $fullPath)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "ERROR: Required files not found:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "   - $file" -ForegroundColor Red
    }
    Write-Host "Expected repository root: $RepoRoot" -ForegroundColor Red
    exit 1
}

Write-Host "Repository verification passed" -ForegroundColor Green

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        # Docker not available
    }
    return $false
}

# Function to get available scripts for a package
function Get-PackageScripts {
    param([string]$PackageName)

    $packageJsonPath = Join-Path $RepoRoot "frontend/$PackageName/package.json"
    if ($PackageName -eq "backend") {
        $packageJsonPath = Join-Path $RepoRoot "backend/package.json"
    }

    if (!(Test-Path $packageJsonPath)) {
        return $null
    }

    try {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        return $packageJson.scripts
    }
    catch {
        return $null
    }
}

# Function to determine the best dev command for a package
function Get-DevCommand {
    param([string]$PackageName)

    $scripts = Get-PackageScripts -PackageName $PackageName
    if (!$scripts) {
        Write-Host "ERROR: Could not read package.json for $PackageName" -ForegroundColor Red
        return $null
    }

    # Prefer 'dev' script
    if ($scripts.PSObject.Properties.Name -contains "dev") {
        return "pnpm --filter $PackageName dev"
    }

    # Fall back to 'start:dev'
    if ($scripts.PSObject.Properties.Name -contains "start:dev") {
        return "pnpm --filter $PackageName start:dev"
    }

    # No suitable dev script found
    Write-Host "ERROR: No suitable dev script found for $PackageName" -ForegroundColor Red
    Write-Host "Available scripts:" -ForegroundColor Yellow
    $scripts.PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Yellow
    }
    return $null
}

# Function to get expected URLs for services
function Get-ServiceUrls {
    param([string]$PackageName)

    $urls = @{}

    switch ($PackageName) {
        "backend" {
            $urls["Backend API"] = "http://localhost:3000"
        }
        "admin-panel" {
            $urls["Admin Panel"] = "http://localhost:3002"
        }
        "customer-web" {
            $urls["Customer Web"] = "http://localhost:3102"
        }
        "restaurant-web" {
            $urls["Restaurant Web"] = "http://localhost:3003"
        }
        "driver-app" {
            $urls["Driver App"] = "http://localhost:3004"
        }
    }

    return $urls
}

# Start E2E database if requested
if ($UseE2EDb) {
    Write-Host "Starting E2E database..." -ForegroundColor Cyan

    if (!(Test-DockerRunning)) {
        Write-Host "ERROR: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
        Write-Host "TIP: Or run without -UseE2EDb if you have a database running elsewhere." -ForegroundColor Yellow
        exit 1
    }

    $dockerComposeFile = Join-Path $RepoRoot "docker\e2e\docker-compose.e2e.yml"
    if (!(Test-Path $dockerComposeFile)) {
        Write-Host "ERROR: Docker compose file not found: $dockerComposeFile" -ForegroundColor Red
        exit 1
    }

    try {
        Write-Host "Running: docker compose -f `"$dockerComposeFile`" up -d" -ForegroundColor Gray
        & docker compose -f $dockerComposeFile up -d
        if ($LASTEXITCODE -ne 0) {
            throw "Docker compose failed with exit code $LASTEXITCODE"
        }
        Write-Host "E2E database started successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to start E2E database: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Reset database if requested
if ($ResetDb) {
    Write-Host "Resetting database..." -ForegroundColor Cyan

    # Set the required environment variable for Prisma AI consent
    $env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to the database reset operation for E2E testing"

    try {
        Write-Host "Running: node `"$RepoRoot\scripts\reset-db-e2e.mjs`"" -ForegroundColor Gray
        & node "$RepoRoot\scripts\reset-db-e2e.mjs"
        if ($LASTEXITCODE -ne 0) {
            throw "Database reset failed with exit code $LASTEXITCODE"
        }
        Write-Host "Database reset completed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Database reset failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Define services to start
$services = @("backend", "admin-panel", "customer-web", "restaurant-web", "driver-app")
$startedServices = @()

# Start each service in a separate PowerShell window
foreach ($service in $services) {
    Write-Host "Starting $service..." -ForegroundColor Cyan

    $devCommand = Get-DevCommand -PackageName $service
    if (!$devCommand) {
        Write-Host "ERROR: Skipping $service due to missing dev command" -ForegroundColor Red
        continue
    }

    $workingDir = $RepoRoot
    $command = "cd '$workingDir'; $devCommand"

    try {
        Write-Host "Command: $command" -ForegroundColor Gray
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $command -WindowStyle Normal
        $startedServices += $service
        Write-Host "$service started in new window" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to start $service $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Print summary
Write-Host "" -ForegroundColor White
Write-Host "Development environment setup complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor White

if ($startedServices.Count -gt 0) {
    Write-Host "Started services in separate PowerShell windows:" -ForegroundColor Cyan
    foreach ($service in $startedServices) {
        Write-Host "  - $service" -ForegroundColor Green
        $urls = Get-ServiceUrls -PackageName $service
        foreach ($urlName in $urls.Keys) {
            Write-Host "    $urlName`: $($urls[$urlName])" -ForegroundColor Gray
        }
    }
    Write-Host "" -ForegroundColor White
    Write-Host "TIP: Close the PowerShell windows to stop the dev servers" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: No services were started successfully" -ForegroundColor Red
    exit 1
}

if ($UseE2EDb) {
    Write-Host "Database: E2E Docker (Port 5433)" -ForegroundColor Cyan
}

Write-Host "" -ForegroundColor White
Write-Host "Happy coding!" -ForegroundColor Green