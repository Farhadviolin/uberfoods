# Manual Smoke Test Automation - UberFoods
# PowerShell script to set up and validate local development environment

param(
    [switch]$SkipDocker,
    [switch]$SkipFrontend,
    [switch]$HealthOnly,
    [switch]$Help
)

# Configuration
$ErrorActionPreference = "Stop"
$ROOT_DIR = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ARTIFACTS_DIR = Join-Path $ROOT_DIR "artifacts\manual-smoke"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"

# Service configuration
$SERVICES = @(
    @{ Name = "Backend API"; Port = 3000; Url = "http://localhost:3000"; HealthEndpoint = "/api/health" },
    @{ Name = "Customer Web"; Port = 3001; Url = "http://localhost:3001" },
    @{ Name = "Admin Panel"; Port = 3002; Url = "http://localhost:3002" },
    @{ Name = "Restaurant Web"; Port = 3003; Url = "http://localhost:3003" },
    @{ Name = "Driver App"; Port = 3004; Url = "http://localhost:3004" }
)

$INFRA_SERVICES = @(
    @{ Name = "PostgreSQL"; Port = 5434; Container = "uberfoods_postgres" },
    @{ Name = "Redis"; Port = 6379; Container = "uberfoods_redis" }
)

if ($Help) {
    Write-Host "UberFoods Manual Smoke Test Automation" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script automates the setup and basic health checks for local development." -ForegroundColor White
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\manual-smoke.ps1 [options]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -SkipDocker    Skip Docker infrastructure setup" -ForegroundColor White
    Write-Host "  -SkipFrontend  Skip starting frontend applications" -ForegroundColor White
    Write-Host "  -HealthOnly    Only run health checks, don't start services" -ForegroundColor White
    Write-Host "  -Help          Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\scripts\manual-smoke.ps1                    # Full setup + health checks" -ForegroundColor White
    Write-Host "  .\scripts\manual-smoke.ps1 -HealthOnly        # Only check running services" -ForegroundColor White
    Write-Host "  .\scripts\manual-smoke.ps1 -SkipFrontend      # Skip frontend apps" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Logging functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    Write-Host "[$Timestamp] [$Level] $Message" -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-Host "" -ForegroundColor White
    Write-Host "[STEP] $Message" -ForegroundColor Magenta
    Write-Host ("-" * ($Message.Length + 7)) -ForegroundColor Magenta
}

# Create artifacts directory
function Initialize-Artifacts {
    if (!(Test-Path $ARTIFACTS_DIR)) {
        New-Item -ItemType Directory -Path $ARTIFACTS_DIR -Force | Out-Null
    }

    $logFile = Join-Path $ARTIFACTS_DIR "smoke-test-$TIMESTAMP.log"
    Write-Log "Artifacts directory: $ARTIFACTS_DIR"
    Write-Log "Log file: $logFile"
    return $logFile
}

# Check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("127.0.0.1", $Port)
        $tcpClient.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Check if process is running on port
function Get-ProcessOnPort {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            $process = Get-Process -Id $connections.OwningProcess -ErrorAction SilentlyContinue
            return $process.ProcessName
        }
    }
    catch {
        # netstat fallback for older Windows
        $netstat = netstat -ano | findstr ":$Port "
        if ($netstat) {
            $pid = ($netstat -split '\s+')[-1]
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            return $process.ProcessName
        }
    }
    return $null
}

# Check environment files
function Test-EnvironmentFiles {
    Write-Step "Checking Environment Files"

    $envFiles = @(
        "backend\.env",
        "frontend\admin-panel\.env",
        "frontend\customer-web\.env",
        "frontend\restaurant-web\.env",
        "frontend\driver-app\.env"
    )

    $missingFiles = @()
    foreach ($file in $envFiles) {
        $fullPath = Join-Path $ROOT_DIR $file
        if (!(Test-Path $fullPath)) {
            $missingFiles += $file
            Write-Log "Missing: $file" -Level "WARN"
        } else {
            Write-Log "Found: $file" -Level "SUCCESS"
        }
    }

    if ($missingFiles.Count -gt 0) {
        Write-Log "Some environment files are missing. Copy from .example files if available." -Level "WARN"
        return $false
    }

    return $true
}

# Check Docker infrastructure
function Test-DockerInfrastructure {
    Write-Step "Checking Docker Infrastructure"

    # Check if Docker is running
    try {
        $dockerVersion = docker version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Docker is not running or not accessible" -Level "ERROR"
            Write-Log "Please start Docker Desktop and try again" -Level "ERROR"
            return $false
        }
        Write-Log "Docker is running" -Level "SUCCESS"
    }
    catch {
        Write-Log "Docker check failed: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }

    # Check docker compose
    try {
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Docker Compose not available" -Level "ERROR"
            return $false
        }
        Write-Log "Docker Compose available" -Level "SUCCESS"
    }
    catch {
        Write-Log "Docker Compose check failed" -Level "ERROR"
        return $false
    }

    # Check infrastructure containers
    Write-Log "Checking infrastructure containers..."
    foreach ($service in $INFRA_SERVICES) {
        $containerName = $service.Container
        try {
            $containerStatus = docker ps --filter "name=$containerName" --format "{{.Names}}:{{.Status}}" 2>&1
            if ($containerStatus -and $containerStatus.Contains($containerName)) {
                Write-Log "$($service.Name) container is running" -Level "SUCCESS"
            } else {
                Write-Log "$($service.Name) container is not running" -Level "WARN"
            }
        }
        catch {
            Write-Log "Failed to check $($service.Name) container: $($_.Exception.Message)" -Level "ERROR"
        }
    }

    return $true
}

# Start Docker infrastructure
function Start-DockerInfrastructure {
    if ($SkipDocker) {
        Write-Log "Skipping Docker infrastructure setup (-SkipDocker)" -Level "WARN"
        return $true
    }

    Write-Step "Starting Docker Infrastructure"

    Push-Location $ROOT_DIR
    try {
        Write-Log "Starting PostgreSQL and Redis..."
        $startOutput = docker compose up -d postgres redis 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Failed to start infrastructure: $startOutput" -Level "ERROR"
            return $false
        }

        Write-Log "Waiting for services to be healthy..."
        Start-Sleep -Seconds 10

        # Check if containers started
        $containers = docker ps --format "{{.Names}}" 2>&1
        $postgresRunning = $containers | Where-Object { $_ -like "*postgres*" }
        $redisRunning = $containers | Where-Object { $_ -like "*redis*" }

        if ($postgresRunning) {
            Write-Log "PostgreSQL container started" -Level "SUCCESS"
        } else {
            Write-Log "PostgreSQL container failed to start" -Level "ERROR"
            return $false
        }

        if ($redisRunning) {
            Write-Log "Redis container started" -Level "SUCCESS"
        } else {
            Write-Log "Redis container failed to start" -Level "ERROR"
            return $false
        }

        Write-Log "Infrastructure setup complete" -Level "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Error starting infrastructure: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
    finally {
        Pop-Location
    }
}

# Start backend service
function Start-Backend {
    Write-Step "Starting Backend Service"

    $backendDir = Join-Path $ROOT_DIR "backend"
    if (!(Test-Path $backendDir)) {
        Write-Log "Backend directory not found: $backendDir" -Level "ERROR"
        return $false
    }

    Push-Location $backendDir
    try {
        # Check if already running
        if (Test-Port -Port 3000) {
            $processName = Get-ProcessOnPort -Port 3000
            if ($processName) {
                Write-Log "Backend already running on port 3000 (process: $processName)" -Level "WARN"
                return $true
            }
        }

        Write-Log "Starting backend service..."
        Write-Log "Command: npm run dev"
        Write-Log "Working directory: $backendDir"

        # Start backend in background
        $startJob = Start-Job -ScriptBlock {
            param($dir)
            Set-Location $dir
            & npm run dev 2>&1
        } -ArgumentList $backendDir

        # Wait for startup
        Write-Log "Waiting for backend to start..."
        Start-Sleep -Seconds 5

        # Check if port is now listening
        $maxRetries = 12
        $retryCount = 0
        while ($retryCount -lt $maxRetries) {
            if (Test-Port -Port 3000) {
                Write-Log "Backend service started on port 3000" -Level "SUCCESS"
                return $true
            }
            Start-Sleep -Seconds 5
            $retryCount++
            Write-Log "Waiting for backend... ($retryCount/$maxRetries)"
        }

        Write-Log "Backend failed to start within timeout" -Level "ERROR"
        return $false
    }
    catch {
        Write-Log "Error starting backend: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
    finally {
        Pop-Location
    }
}

# Start frontend applications
function Start-FrontendApps {
    if ($SkipFrontend) {
        Write-Log "Skipping frontend applications (-SkipFrontend)" -Level "WARN"
        return $true
    }

    Write-Step "Starting Frontend Applications"

    $frontendApps = @(
        @{ Name = "Admin Panel"; Dir = "frontend\admin-panel"; Port = 3002 },
        @{ Name = "Customer Web"; Dir = "frontend\customer-web"; Port = 3001 },
        @{ Name = "Restaurant Web"; Dir = "frontend\restaurant-web"; Port = 3003 },
        @{ Name = "Driver App"; Dir = "frontend\driver-app"; Port = 3004 }
    )

    $results = @{}
    foreach ($app in $frontendApps) {
        $appDir = Join-Path $ROOT_DIR $app.Dir
        if (!(Test-Path $appDir)) {
            Write-Log "$($app.Name) directory not found: $appDir" -Level "ERROR"
            $results[$app.Name] = $false
            continue
        }

        # Check if already running
        if (Test-Port -Port $app.Port) {
            $processName = Get-ProcessOnPort -Port $app.Port
            if ($processName) {
                Write-Log "$($app.Name) already running on port $($app.Port) (process: $processName)" -Level "WARN"
                $results[$app.Name] = $true
                continue
            }
        }

        Write-Log "Starting $($app.Name)..."
        Write-Log "Command: npm run dev"
        Write-Log "Working directory: $appDir"
        Write-Log "Expected port: $($app.Port)"

        try {
            Push-Location $appDir

            # Start app in background job
            $startJob = Start-Job -ScriptBlock {
                param($dir, $name)
                Set-Location $dir
                Write-Host "Starting $name in $dir"
                & npm run dev 2>&1
            } -ArgumentList $appDir, $app.Name

            # Brief wait
            Start-Sleep -Seconds 2

            # Note: We don't wait for frontend apps to be fully ready
            # They take longer to start and we want to proceed with health checks
            Write-Log "$($app.Name) start command issued" -Level "SUCCESS"
            $results[$app.Name] = $true
        }
        catch {
            Write-Log "Error starting $($app.Name): $($_.Exception.Message)" -Level "ERROR"
            $results[$app.Name] = $false
        }
        finally {
            Pop-Location
        }
    }

    return $results
}

# Run health checks
function Test-HealthChecks {
    Write-Step "Running Health Checks"

    $results = @{}

    # Backend health check
    Write-Log "Checking Backend API health..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Log "Backend health check PASSED" -Level "SUCCESS"
            $results["Backend"] = $true
        } else {
            Write-Log "Backend health check FAILED (Status: $($response.StatusCode))" -Level "ERROR"
            $results["Backend"] = $false
        }
    }
    catch {
        Write-Log "Backend health check FAILED: $($_.Exception.Message)" -Level "ERROR"
        $results["Backend"] = $false
    }

    # Port availability checks
    Write-Log "Checking service ports..."
    foreach ($service in $SERVICES) {
        $portOpen = Test-Port -Port $service.Port
        if ($portOpen) {
            Write-Log "$($service.Name) port $($service.Port) is accessible" -Level "SUCCESS"
            $results[$service.Name] = $true
        } else {
            Write-Log "$($service.Name) port $($service.Port) is not accessible" -Level "WARN"
            $results[$service.Name] = $false
        }
    }

    # Infrastructure checks
    Write-Log "Checking infrastructure..."
    foreach ($service in $INFRA_SERVICES) {
        $portOpen = Test-Port -Port $service.Port
        if ($portOpen) {
            Write-Log "$($service.Name) port $($service.Port) is accessible" -Level "SUCCESS"
            $results[$service.Name] = $true
        } else {
            Write-Log "$($service.Name) port $($service.Port) is not accessible" -Level "WARN"
            $results[$service.Name] = $false
        }
    }

    return $results
}

# Display results and URLs
function Show-Results {
    param([hashtable]$HealthResults)

    Write-Step "Manual Smoke Test Results"

    Write-Host "[STATUS] Service Status:" -ForegroundColor Cyan
    foreach ($service in $SERVICES) {
        $status = if ($HealthResults.ContainsKey($service.Name) -and $HealthResults[$service.Name]) { "[OK] RUNNING" } else { "[FAIL] NOT READY" }
        Write-Host "  $($service.Name): $status ($($service.Url))" -ForegroundColor $(if ($HealthResults[$service.Name]) { "Green" } else { "Red" })
    }

    Write-Host "" -ForegroundColor White
    Write-Host "[INFRA] Infrastructure Status:" -ForegroundColor Cyan
    foreach ($service in $INFRA_SERVICES) {
        $status = if ($HealthResults.ContainsKey($service.Name) -and $HealthResults[$service.Name]) { "[OK] RUNNING" } else { "[FAIL] NOT READY" }
        Write-Host "  $($service.Name): $status (localhost:$($service.Port))" -ForegroundColor $(if ($HealthResults[$service.Name]) { "Green" } else { "Red" })
    }

    Write-Host "" -ForegroundColor White
    Write-Host "[READY] Ready for Manual Testing:" -ForegroundColor Green
    Write-Host "" -ForegroundColor White

    Write-Host "Admin Panel:    http://localhost:3002" -ForegroundColor Yellow
    Write-Host "Customer Web:   http://localhost:3001" -ForegroundColor Yellow
    Write-Host "Restaurant Web: http://localhost:3003" -ForegroundColor Yellow
    Write-Host "Driver App:     http://localhost:3004" -ForegroundColor Yellow
    Write-Host "Backend API:    http://localhost:3000" -ForegroundColor Yellow
    Write-Host "Backend Health: http://localhost:3000/api/health" -ForegroundColor Yellow

    Write-Host "" -ForegroundColor White
    Write-Host "[NEXT] Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Open each URL in a separate browser tab" -ForegroundColor White
    Write-Host "2. Follow the manual test steps in docs/manual-smoke-test.md" -ForegroundColor White
    Write-Host "3. Document any issues in docs/manual-smoke-evidence.md" -ForegroundColor White
    Write-Host "4. Check logs in: $ARTIFACTS_DIR" -ForegroundColor White

    Write-Host "" -ForegroundColor White
    Write-Host "[STOP] To stop all services:" -ForegroundColor Red
    Write-Host "   docker compose down" -ForegroundColor White
    Write-Host "   # Kill any remaining Node processes" -ForegroundColor White
}

# Main execution
function Main {
    Write-Host "[START] UberFoods Manual Smoke Test Automation" -ForegroundColor Magenta
    Write-Host "===============================================" -ForegroundColor Magenta
    Write-Host ""

    $logFile = Initialize-Artifacts
    $startTime = Get-Date

    try {
        $results = @{}

        # Pre-flight checks
        $envOk = Test-EnvironmentFiles
        $dockerOk = Test-DockerInfrastructure

        if ($HealthOnly) {
            Write-Log "Health-only mode: Skipping service startup"
        } else {
            # Start infrastructure
            $infraStarted = Start-DockerInfrastructure
            $results["Infrastructure"] = $infraStarted

            if ($infraStarted) {
                # Start backend
                $backendStarted = Start-Backend
                $results["BackendStart"] = $backendStarted

                # Start frontends
                $frontendResults = Start-FrontendApps
                $results["FrontendApps"] = $frontendResults
            }
        }

        # Run health checks
        Write-Log "Running comprehensive health checks..."
        Start-Sleep -Seconds 5  # Give services time to start
        $healthResults = Test-HealthChecks
        $results["HealthChecks"] = $healthResults

        # Display results
        Show-Results -HealthResults $healthResults

        # Summary
        $endTime = Get-Date
        $duration = $endTime - $startTime

        Write-Host "" -ForegroundColor White
        Write-Host "[TIME] Test completed in $($duration.TotalSeconds.ToString("F1")) seconds" -ForegroundColor Cyan
        Write-Host "[LOGS] Logs saved to: $ARTIFACTS_DIR" -ForegroundColor Cyan

        # Export results to JSON for analysis
        $resultsJson = @{
            timestamp = $TIMESTAMP
            duration_seconds = $duration.TotalSeconds
            environment_checks = @{
                env_files_ok = $envOk
                docker_ok = $dockerOk
            }
            service_results = $results
            health_results = $healthResults
        } | ConvertTo-Json -Depth 5

        $resultsFile = Join-Path $ARTIFACTS_DIR "results-$TIMESTAMP.json"
        $resultsJson | Out-File -FilePath $resultsFile -Encoding UTF8
        Write-Log "Results exported to: $resultsFile"

    }
    catch {
        Write-Log "Script execution failed: $($_.Exception.Message)" -Level "ERROR"
        Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level "ERROR"
        exit 1
    }
}

# Run main function
Main