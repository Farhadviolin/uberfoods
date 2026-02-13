# E2E Database Runner for Windows PowerShell
# Ensures deterministic E2E PostgreSQL database startup

param(
    [int]$DockerWaitSeconds = 300,
    [int]$RetryIntervalSeconds = 2
)

# Ensure we work from repository root
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# Set stable Docker Compose project name for consistent resource naming
if (-not $env:COMPOSE_PROJECT_NAME) {
    $env:COMPOSE_PROJECT_NAME = "uberfoods-e2e"
}

# Resolve compose file path deterministically
$ComposeFile = Join-Path $RepoRoot "docker/e2e/docker-compose.e2e.yml"
if (-not (Test-Path $ComposeFile)) {
    throw "Compose file not found: $ComposeFile"
}

# Define canonical compose base args for consistency
$composeBase = @("compose", "-f", $ComposeFile, "--project-name", $env:COMPOSE_PROJECT_NAME, "--project-directory", $RepoRoot)

# Function to run native commands safely with retries
function Invoke-Native([string]$Name, [scriptblock]$Cmd, [int]$Retries = 0, [int]$SleepSec = 2) {
    for ($a = 0; $a -le $Retries; $a++) {
        # Capture stdout and stderr separately to avoid PowerShell exception handling
        $tempOut = [System.IO.Path]::GetTempFileName()
        $tempErr = [System.IO.Path]::GetTempFileName()

        try {
            $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "$Cmd 2> `"$tempErr`" > `"$tempOut`"" -NoNewWindow -Wait -PassThru
            $out = Get-Content $tempOut -Raw
            $err = Get-Content $tempErr -Raw
            $combined = "$out`n$err".Trim()
            $code = $process.ExitCode

            if ($code -eq 0) {
                return @{ ok = $true; code = $code; out = $combined }
            }

            # Check if this is a retryable docker issue
            $retryable = ($combined -match "already in use" -or
                         $combined -match "Creating" -or
                         $combined -match "in progress" -or
                         $combined -match "conflict" -or
                         $combined -match "network.*is ambiguous")

            if ($a -lt $Retries -and $retryable) {
                Write-Log "Retryable $Name issue (attempt $($a + 1)/$($Retries + 1)), waiting ${SleepSec}s: $combined" "WARN"
                Start-Sleep -Seconds $SleepSec
                continue
            }

            return @{ ok = $false; code = $code; out = $combined }
        } catch {
            if ($a -lt $Retries) {
                Write-Log "$Name failed with exception (attempt $($a + 1)/$($Retries + 1)), retrying in ${SleepSec}s: $($_.Exception.Message)" "WARN"
                Start-Sleep -Seconds $SleepSec
                continue
            }
            return @{ ok = $false; code = -1; out = $_.Exception.Message }
        } finally {
            # Clean up temp files
            Remove-Item $tempOut -ErrorAction SilentlyContinue
            Remove-Item $tempErr -ErrorAction SilentlyContinue
        }
    }
}

# Log file path
$LogFile = Join-Path $RepoRoot "artifacts/e2e-customer/db-start.log"

# Function to write to both console and log file
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")

    $Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    $LogLine = "[$Timestamp] [$Level] $Message"

    Write-Host $LogLine
    Add-Content -Path $LogFile -Value $LogLine
}

# Initialize log
Write-Log "=== E2E Database Startup Script Started ==="
Write-Log "Repository Root: $RepoRoot"
Write-Log "Log File: $LogFile"
Write-Log "Docker Wait Timeout: ${DockerWaitSeconds}s"
Write-Log "Retry Interval: ${RetryIntervalSeconds}s"

# Pre-flight diagnostics
Write-Log "=== Pre-flight Diagnostics ==="

# Check Docker version
try {
    $dockerVersion = docker version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Docker version check successful"
        Write-Log "Docker version output: $dockerVersion"
    } else {
        Write-Log "Docker version check failed: $dockerVersion" "WARN"
    }
} catch {
    Write-Log "Docker version check failed with exception: $($_.Exception.Message)" "WARN"
}

# Check Docker context
try {
    $dockerContext = docker context ls 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Docker context check successful"
        Write-Log "Docker context output: $dockerContext"
    } else {
        Write-Log "Docker context check failed: $dockerContext" "WARN"
    }
} catch {
    Write-Log "Docker context check failed with exception: $($_.Exception.Message)" "WARN"
}

# Check Docker Desktop process
$dockerDesktopProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerDesktopProcess) {
    Write-Log "Docker Desktop process is running (PID: $($dockerDesktopProcess.Id))"
} else {
    Write-Log "Docker Desktop process is not running" "WARN"
}

# Check Docker service
$dockerService = Get-Service com.docker.service -ErrorAction SilentlyContinue
if ($dockerService) {
    Write-Log "Docker service found: $($dockerService.Status)"
} else {
    Write-Log "Docker service 'com.docker.service' not found" "WARN"
}

# Check WSL status
Write-Log "=== WSL Diagnostics ==="
try {
    $wslStatus = wsl --status 2>&1
    Write-Log "WSL status: $wslStatus"
} catch {
    Write-Log "WSL status check failed: $($_.Exception.Message)" "WARN"
}

try {
    $wslList = wsl -l -v 2>&1
    Write-Log "WSL distributions: $wslList"
    if ($wslList -match "docker-desktop") {
        Write-Log "WSL: docker-desktop distribution found"
    } else {
        Write-Log "WSL: docker-desktop distribution not found" "WARN"
    }
    if ($wslList -match "docker-desktop-data") {
        Write-Log "WSL: docker-desktop-data distribution found"
    } else {
        Write-Log "WSL: docker-desktop-data distribution not found" "WARN"
    }
} catch {
    Write-Log "WSL list check failed: $($_.Exception.Message)" "WARN"
}

Write-Log "=== Starting Docker Engine Check ==="

# Function to check Docker engine
function Test-DockerEngine {
    try {
        $result = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Docker Engine is running"
            return $true
        } else {
            Write-Log "Docker Engine check failed: $result" "WARN"
            # Store last error for diagnosis
            $script:LastDockerInfoError = $result
            return $false
        }
    } catch {
        Write-Log "Docker Engine check failed with exception: $($_.Exception.Message)" "WARN"
        $script:LastDockerInfoError = $_.Exception.Message
        return $false
    }
}

# Function to find Docker Desktop executable
function Find-DockerDesktopExe {
    $possiblePaths = @(
        "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${Env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$Env:LocalAppData\Docker\Docker Desktop.exe",
        "$Env:AppData\Docker\Docker Desktop.exe"
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            Write-Log "Docker Desktop executable found: $path"
            return $path
        }
    }

    Write-Log "Docker Desktop executable not found in standard locations" "WARN"
    return $null
}

# Function to start Docker service
function Start-DockerService {
    $dockerService = Get-Service com.docker.service -ErrorAction SilentlyContinue
    if ($dockerService) {
        Write-Log "Docker service status: $($dockerService.Status)"
        if ($dockerService.Status -ne 'Running') {
            Write-Log "Starting Docker service..."
            try {
                Start-Service com.docker.service
                Start-Sleep -Seconds 5
                $dockerService.Refresh()
                Write-Log "Docker service status after start: $($dockerService.Status)"
            } catch {
                Write-Log "Failed to start Docker service: $($_.Exception.Message)" "ERROR"
            }
        }
    } else {
        Write-Log "Docker service not found, skipping service management" "WARN"
    }
}

# Function to wait for Docker engine to start
function Wait-DockerEngine {
    Write-Log "Waiting for Docker Engine to start (timeout: ${DockerWaitSeconds}s)..."

    $startTime = Get-Date
    $endTime = $startTime.AddSeconds($DockerWaitSeconds)
    $lastStatusLog = Get-Date

    while ((Get-Date) -lt $endTime) {
        if (Test-DockerEngine) {
            $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
            Write-Log "Docker Engine started successfully after ${duration}s"
            return $true
        }

        # Log status every 10 seconds
        if (((Get-Date) - $lastStatusLog).TotalSeconds -ge 10) {
            $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
            Write-Log "Docker Engine still not ready after ${elapsed}s..."
            $lastStatusLog = Get-Date
        }

        Start-Sleep -Seconds $RetryIntervalSeconds
    }

    Write-Log "Docker Engine failed to start within ${DockerWaitSeconds}s timeout" "ERROR"
    return $false
}

# Function to check Docker Compose
function Test-DockerCompose {
    try {
        $result = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Docker Compose is available: $result"
            return $true
        } else {
            Write-Log "Docker Compose check failed: $result" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Docker Compose check failed with exception: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function to start E2E database
function Start-E2EDatabase {
# Compose file is already validated at the top of the script

    # Set deterministic project identity
    $env:COMPOSE_PROJECT_NAME = "uberfoods-e2e"

    # Check if container is already running and healthy
    Write-Log "Checking if E2E database is already running..."
    try {
        $psArgs = $composeBase + @("ps", "-q", "postgres-e2e")
        $cid = & docker @psArgs 2>$null
        if ($cid) {
            $cid = $cid.Trim()
            Write-Log "Found existing container: $cid"

            # Check if database is ready
            $result = docker exec $cid pg_isready -U uberfoods -d uberfoods_e2e 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Database is already running and ready, reusing it"
                return $true
            } else {
                Write-Log "Database container exists but is not ready, will restart" "WARN"
            }
        }
    } catch {
        Write-Log "No existing container found or check failed, will start fresh" "WARN"
    }

    # Only clean up if we need to start fresh
    Write-Log "Cleaning up previous E2E containers and networks..."
    try {
        $downArgs = $composeBase + @("down", "-v", "--remove-orphans")
        & docker @downArgs 2>&1 | Out-Null
        Write-Log "Cleanup initiated"

        # Wait for network to be removed to avoid race conditions
        Write-Log "Waiting for network cleanup to complete..."
        $networkRemoved = $false
        for ($i = 0; $i -lt 10; $i++) {  # Reduced to 10 seconds
            try {
                $networks = docker network ls --format "{{.Name}}" 2>&1
                # Check for both possible network names
                if (($networks -notmatch "uberfoods.e2e") -or ($networks -notmatch "uberfoods_e2e_network")) {
                    $networkRemoved = $true
                    break
                }
            } catch { }
            Start-Sleep -Seconds 1
        }

        if ($networkRemoved) {
            Write-Log "Network cleanup completed"
        } else {
            Write-Log "Network cleanup timeout (continuing anyway)" "WARN"
        }
    } catch {
        Write-Log "Cleanup failed (continuing): $($_.Exception.Message)" "WARN"
    }

    Write-Log "Starting E2E database with: docker compose -f $ComposeFile up -d"

    # Use composeBase array for reliable docker compose up
    $upArgs = $composeBase + @("up", "-d", "--remove-orphans")
    $upResult = & docker @upArgs 2>&1
    $upExitCode = $LASTEXITCODE

    if ($upExitCode -ne 0) {
        Write-Log "docker compose up failed (code $upExitCode): $upResult" "ERROR"

        # Aggressive cleanup and retry on network conflicts
        Write-Log "Attempting aggressive cleanup and retry..." "WARN"
        try {
            # Force stop and remove containers
            docker stop uberfoods_postgres_e2e 2>&1 | Out-Null
            docker rm -f uberfoods_postgres_e2e 2>&1 | Out-Null

            # Force remove networks
            docker network rm uberfoods-e2e_uberfoods_e2e_network 2>&1 | Out-Null
            docker network rm uberfoods_e2e_network 2>&1 | Out-Null

            # Remove volumes
            docker volume rm uberfoods-e2e_postgres_e2e_data 2>&1 | Out-Null

            Write-Log "Aggressive cleanup completed, retrying docker compose up..."
            Start-Sleep -Seconds 2

            $upResult = & docker @upArgs 2>&1
            $upExitCode = $LASTEXITCODE
        } catch {
            Write-Log "Aggressive cleanup failed: $($_.Exception.Message)" "WARN"
        }

        if ($upExitCode -ne 0) {
            Write-Log "docker compose up still failed after retry (code $upExitCode): $upResult" "ERROR"

            # Try with --force-recreate as last resort
            Write-Log "Trying with --force-recreate..." "WARN"
            try {
                $forceArgs = $composeBase + @("up", "-d", "--force-recreate", "--remove-orphans")
                $forceResult = & docker @forceArgs 2>&1
                $forceExitCode = $LASTEXITCODE

                if ($forceExitCode -eq 0) {
                    Write-Log "docker compose up with --force-recreate succeeded"
                    $upExitCode = 0
                } else {
                    Write-Log "docker compose up with --force-recreate also failed (code $forceExitCode): $forceResult" "ERROR"
                }
            } catch {
                Write-Log "Force recreate failed with exception: $($_.Exception.Message)" "ERROR"
            }
        }

        if ($upExitCode -ne 0) {
            # Show current state for debugging
            try {
                & docker @($composeBase + @("ps")) 2>&1 | ForEach-Object { Write-Log "PS: $_" "ERROR" }
                & docker @($composeBase + @("logs", "--tail=50")) 2>&1 | ForEach-Object { Write-Log "LOG: $_" "ERROR" }
            } catch { }
            throw "docker compose up failed after all attempts (code $upExitCode)"
        }
    }

    Write-Log "Docker Compose succeeded"
    # Give containers a moment to fully start
    Start-Sleep -Seconds 3
    $success = $true

    if ($success) {
        Write-Log "Docker Compose output: $result"
        Write-Log "Docker Compose started successfully"

        # Wait for database to be ready
        Write-Log "Waiting for PostgreSQL database to be ready..."
        $dbReady = $false
        $dbWaitRetries = 30  # 30 * 2 seconds = 60 seconds max wait

        for ($i = 0; $i -lt $dbWaitRetries; $i++) {
            try {
                # Get container ID
                $psArgs = $composeBase + @("ps", "-q", "postgres-e2e")
                $cid = & docker @psArgs 2>$null
                if ($cid) {
                    $cid = $cid.Trim()
                    # Try pg_isready
                    $result = docker exec $cid pg_isready -U uberfoods -d uberfoods_e2e 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Log "Database ready after ${i * 2}s"
                        $dbReady = $true
                        break
                    }
                }
            } catch { }

            Write-Log "Database not ready yet, waiting... (${i * 2}s elapsed)"
            Start-Sleep -Seconds 2
        }

        if ($dbReady) {
            Write-Log "PostgreSQL E2E database is ready"
            return $true
        } else {
            Write-Log "Database failed to become ready within timeout" "ERROR"
            return $false
        }
    } else {
        Write-Log "Docker Compose failed after $maxRetries attempts" "ERROR"
        return $false
    }
}

# Function to verify container
function Test-ContainerStatus {
    Write-Log "Checking container status..."

    try {
        $containers = docker ps --filter "name=postgres-e2e" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
        Write-Log "Container status: $containers"

        if ($containers -match "postgres-e2e") {
            Write-Log "PostgreSQL E2E container is running"
            return $true
        } else {
            Write-Log "PostgreSQL E2E container not found in running containers" "WARN"

            # Check all containers
            $allContainers = docker ps -a --filter "name=postgres-e2e" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
            Write-Log "All containers with postgres-e2e: $allContainers"
            return $false
        }
    } catch {
        Write-Log "Container status check failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function to test port connectivity
function Test-PortConnectivity {
    param([int]$Port = 5433)

    Write-Log "Testing connectivity to localhost:$Port..."

    try {
        $result = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
        if ($result) {
            Write-Log "Port $Port is reachable"
            return $true
        } else {
            Write-Log "Port $Port is not reachable" "WARN"

            # Additional port check with netstat
            Write-Log "Checking port usage with netstat..."
            $netstat = netstat -ano | findstr ":$Port" 2>&1
            if ($netstat) {
                Write-Log "Port $Port usage: $netstat"
            } else {
                Write-Log "Port $Port appears to be free"
            }

            return $false
        }
    } catch {
        Write-Log "Port connectivity test failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Main execution
try {
    Write-Log "=== Starting E2E Database Setup ==="

    # 1. Check and manage Docker service
    Start-DockerService

    # 2. Check Docker Engine
    if (-not (Test-DockerEngine)) {
        Write-Log "Docker Engine not running, attempting to start Docker Desktop..." "WARN"

        # Try to start Docker Desktop from various locations
        $dockerDesktopExe = Find-DockerDesktopExe
        if ($dockerDesktopExe) {
            try {
                Write-Log "Starting Docker Desktop from: $dockerDesktopExe"
                Start-Process $dockerDesktopExe -ErrorAction SilentlyContinue
                Write-Log "Attempted to start Docker Desktop"
            } catch {
                Write-Log "Could not start Docker Desktop: $($_.Exception.Message)" "WARN"
            }
        } else {
            Write-Log "Docker Desktop executable not found, cannot start automatically" "ERROR"
        }

        if (-not (Wait-DockerEngine)) {
            Write-Log "Failed to start Docker Engine" "ERROR"

            # Comprehensive diagnosis summary
            Write-Log "=== DIAGNOSIS SUMMARY ===" "ERROR"
            Write-Log "Docker Engine could not be started. Troubleshooting information:" "ERROR"

            # Service status
            $dockerService = Get-Service com.docker.service -ErrorAction SilentlyContinue
            if ($dockerService) {
                Write-Log "Docker Service Status: $($dockerService.Status)" "ERROR"
            } else {
                Write-Log "Docker Service: Not found" "ERROR"
            }

            # WSL status summary
            try {
                $wslStatus = wsl --status 2>&1
                Write-Log "WSL Status: $wslStatus" "ERROR"
            } catch {
                Write-Log "WSL Status: Check failed" "ERROR"
            }

            # Docker Desktop executable
            $dockerDesktopExe = Find-DockerDesktopExe
            if ($dockerDesktopExe) {
                Write-Log "Docker Desktop EXE: Found at $dockerDesktopExe" "ERROR"
            } else {
                Write-Log "Docker Desktop EXE: Not found in standard locations" "ERROR"
            }

            # Last Docker info error
            if ($script:LastDockerInfoError) {
                Write-Log "Last Docker Info Error: $script:LastDockerInfoError" "ERROR"
            } else {
                Write-Log "Last Docker Info Error: No error captured" "ERROR"
            }

            Write-Log "=== END DIAGNOSIS SUMMARY ===" "ERROR"

            exit 1
        }
    }

    # 2. Check Docker Compose
    if (-not (Test-DockerCompose)) {
        Write-Log "Docker Compose not available" "ERROR"
        exit 1
    }

    # 3. Start E2E Database
    if (-not (Start-E2EDatabase)) {
        Write-Log "Failed to start E2E database" "ERROR"
        exit 1
    }

    # 4. Wait a moment for container to start
    Write-Log "Waiting 5 seconds for container to initialize..."
    Start-Sleep -Seconds 5

    # 5. Verify container status
    if (-not (Test-ContainerStatus)) {
        Write-Log "Container verification failed" "WARN"
        # Continue to port test - container might be starting
    }

    # 6. Test port connectivity
    if (-not (Test-PortConnectivity -Port 5433)) {
        Write-Log "Port connectivity test failed" "ERROR"

        # Additional troubleshooting info
        Write-Log "=== Troubleshooting Information ==="
        Write-Log "Checking all Docker containers..."
        $allDockerPs = docker ps -a 2>&1
        Write-Log "All containers: $allDockerPs"

        Write-Log "Checking Docker networks..."
        $networks = docker network ls 2>&1
        Write-Log "Networks: $networks"

        Write-Log "Checking Docker Compose services..."
        $services = & docker @($composeBase + @("ps")) 2>&1
        Write-Log "Services: $services"

        exit 1
    }

    Write-Log "=== E2E Database Setup Completed Successfully ==="
    Write-Log "PostgreSQL E2E database is running and accessible on localhost:5433"

} catch {
    Write-Log "Script failed with exception: $($_.Exception.Message)" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
    exit 1
}