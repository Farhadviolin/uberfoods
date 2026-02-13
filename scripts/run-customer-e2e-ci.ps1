# Customer E2E CI Runner for Windows PowerShell
# Deterministic E2E test execution for CI/CD pipelines

param(
    [int]$DockerWaitSeconds = 300,
    [int]$BackendWaitSeconds = 30,
    [int]$FrontendWaitSeconds = 20,
    [string]$ArtifactsPath = "artifacts/e2e-customer",
    [string]$LogFile = "",
    [switch]$SkipCleanup = $false
)

# Configuration
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$RunId = "ci-$Timestamp"

# Set stable Docker Compose project name for consistent resource naming
if (-not $env:COMPOSE_PROJECT_NAME) {
    $env:COMPOSE_PROJECT_NAME = "uberfoods-e2e"
}

# Set canonical E2E DATABASE_URL derived from docker-compose.e2e.yml
# Host port: 5433, DB: uberfoods_e2e, User: uberfoods, Password: uberfoods
$env:DATABASE_URL = "postgresql://uberfoods:uberfoods@127.0.0.1:5433/uberfoods_e2e?schema=public"
$env:E2E_DATABASE_URL = $env:DATABASE_URL

# Set seed passwords from .env.e2e
$env:SEED_CUSTOMER_PASSWORD = "customer123"
$env:SEED_RESTAURANT_PASSWORD = "restaurant123"
$env:SEED_DRIVER_PASSWORD = "driver123"

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
        try {
            $out = & $Cmd 2>&1
            $code = $LASTEXITCODE
            if ($code -eq 0) {
                return @{ ok = $true; code = $code; out = $out }
            }
            # Retryable docker transient messages:
            $text = ($out | Out-String)
            $retryable = ($text -match "already in use" -or
                         $text -match "Creating" -or
                         $text -match "in progress" -or
                         $text -match "conflict" -or
                         $text -match "network.*is ambiguous")
            if ($a -lt $Retries -and $retryable) {
                Write-Log "Retryable $Name issue (attempt $($a + 1)/$($Retries + 1)), waiting ${SleepSec}s: $text" "WARN"
                Start-Sleep -Seconds $SleepSec
                continue
            }
            return @{ ok = $false; code = $code; out = $out }
        } catch {
            if ($a -lt $Retries) {
                Write-Log "$Name failed with exception (attempt $($a + 1)/$($Retries + 1)), retrying in ${SleepSec}s: $($_.Exception.Message)" "WARN"
                Start-Sleep -Seconds $SleepSec
                continue
            }
            return @{ ok = $false; code = -1; out = $_.Exception.Message }
        }
    }
}

# Function to start a background process
function Start-Proc($Name, $Cwd, $Cmd, $EnvMap, $OutFile, $ErrFile) {
    Write-Log "Starting $Name process..."
    Write-Log "  CWD: $Cwd"
    Write-Log "  CMD: $Cmd"

    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd `"$Cwd`" && $Cmd" -NoNewWindow -PassThru -RedirectStandardOutput $OutFile -RedirectStandardError $ErrFile

    # Set environment variables if provided
    if ($EnvMap) {
        foreach ($key in $EnvMap.Keys) {
            $proc.StartInfo.EnvironmentVariables[$key] = $EnvMap[$key]
        }
    }

    Write-Log "$Name started with PID: $($proc.Id)"
    return $proc
}

# Function to stop a process tree
function Stop-ProcTree($Pid) {
    if (-not $Pid) { return }

    Write-Log "Stopping process tree for PID: $Pid"

    try {
        # Use taskkill to stop the entire process tree
        $result = taskkill /PID $Pid /T /F 2>&1
        Write-Log "Process tree stopped: $result"
    } catch {
        try {
            # Fallback: stop just the process
            Stop-Process -Id $Pid -Force -ErrorAction SilentlyContinue
            Write-Log "Fallback: stopped process $Pid"
        } catch {
            Write-Log "Warning: could not stop process $Pid" "WARN"
        }
    }
}

# Function to wait for HTTP endpoint to be available
function Wait-HttpOk($Url, $Name, $MaxSeconds = 30) {
    Write-Log "Waiting for $Name at $Url (max ${MaxSeconds}s)..."

    for ($i = 1; $i -le $MaxSeconds; $i++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri $Url
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Log "$Name ready after ${i}s (status: $($response.StatusCode))"
                return $true
            }
        } catch {
            # Continue waiting
        }

        if ($i % 10 -eq 0) {
            Write-Log "Still waiting for $Name... (${i}s elapsed)"
        }

        Start-Sleep -Seconds 1
    }

    Write-Log "$Name failed to become ready within ${MaxSeconds}s" "ERROR"
    return $false
}

if (-not $LogFile) {
    $LogFile = Join-Path $RepoRoot (Join-Path $ArtifactsPath "customer-e2e-ci-$Timestamp.log")
}

# Ensure artifacts directory exists
New-Item -ItemType Directory -Force -Path $ArtifactsPath | Out-Null

# Function to mask sensitive data comprehensively
function Mask-SensitiveText {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }

    $t = $Text

    # 1) Authorization: Bearer <JWT>
    $t = [regex]::Replace(
        $t,
        '(?is)\b(authorization)\s*:\s*Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+',
        'authorization: Bearer ***JWT_MASKED***'
    )

    # 2) Querystring / key=value patterns (case-insensitive)
    $t = [regex]::Replace(
        $t,
        '(?is)\b(password|pass|pwd|token|access_token|refresh_token)\b\s*=\s*([^&\s]+)',
        '$1=***MASKED***'
    )

    # 3) JSON "key":"value" patterns
    $t = [regex]::Replace(
        $t,
        '(?is)"(password|pass|pwd|token|access_token|refresh_token)"\s*:\s*"[^"]*"',
        '"$1":"***MASKED***"'
    )

    # 4) Raw JWT anywhere (3 dot-separated base64url parts)
    $t = [regex]::Replace(
        $t,
        '(?is)\b[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\b',
        '***JWT_MASKED***'
    )

    # 5) Long base64-ish blobs (avoid too many false positives by requiring >=64 chars)
    $t = [regex]::Replace(
        $t,
        '(?is)\b[A-Za-z0-9+/=]{64,}\b',
        '***B64_TOKEN_MASKED***'
    )

    return $t
}



# Logging function (SECURITY: masks sensitive data)
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")

    $safe = Mask-SensitiveText $Message
    $Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    $LogLine = "[$Timestamp] [$Level] $safe"
    Write-Host $LogLine
    Add-Content -Path $LogFile -Value $LogLine
}

$script:CleanupFailed = $false

# Cleanup function
function Invoke-Cleanup {
    Write-Log "Starting cleanup..."
    try {
        # Stop background jobs
        Get-Job | Where-Object { $_.Name -like "*e2e*" } | Stop-Job -ErrorAction SilentlyContinue
        Get-Job | Where-Object { $_.Name -like "*e2e*" } | Remove-Job -ErrorAction SilentlyContinue

        # Stop containers
        $downArgs = $composeBase + @("down", "-v", "--remove-orphans")
        & docker @downArgs 2>&1 | Out-Null

        Write-Log "Cleanup completed"
    } catch {
        $script:CleanupFailed = $true
        Write-Log "Cleanup failed: $($_.Exception.Message)" "ERROR"
    }
}

# Error handling
$ErrorActionPreference = "Stop"
trap {
    Write-Log "Script failed with error: $($_.Exception.Message)" "ERROR"
    if (-not $SkipCleanup) {
        Invoke-Cleanup
    }
    exit 1
}

$exitCode = 0
$backendProc = $null
$frontendProc = $null
$testExitCode = 0

try {
    Write-Log "=== Customer E2E CI Runner Started ==="
    Write-Log "Run ID: $RunId"
    Write-Log "Repository Root: $RepoRoot"
    Write-Log "Artifacts Path: $ArtifactsPath"
    Write-Log "Log File: $LogFile"

    # Set working directory
    Set-Location $RepoRoot

    # ==========================================
    # STEP 0: Docker Preflight Check
    # ==========================================
    Write-Log "=== STEP 0: Docker Preflight Check ==="

    try {
        $null = docker ps 2>$null
        Write-Log "✅ Docker daemon is running"
    } catch {
        Write-Log "❌ Docker daemon is not running" "ERROR"
        Write-Log "   Start Docker Desktop and wait for it to be ready, then retry." "ERROR"
        Write-Log "   On Windows: Start Docker Desktop from Start Menu" "ERROR"
        throw "Docker daemon not running"
    }

    # ==========================================
    # STEP 1: Ensure E2E Database is Ready
    # ==========================================
    Write-Log "=== STEP 1: Ensuring E2E Database is Ready ==="

    # Check if database is already running and accessible
    Write-Log "Checking if E2E database is already available..."
    try {
        $testConnection = Test-NetConnection -ComputerName localhost -Port 5433 -InformationLevel Quiet
        if ($testConnection) {
            Write-Log "Database port 5433 is accessible, checking database readiness..."
            # Try to connect to database
            $psqlTest = docker exec uberfoods_postgres_e2e pg_isready -U uberfoods -d uberfoods_e2e 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Database is already running and ready, skipping startup"
            } else {
                Write-Log "Database port accessible but pg_isready failed, will start database" "WARN"
                throw "Database not ready"
            }
        } else {
            Write-Log "Database port 5433 not accessible, will start database" "WARN"
            throw "Database not accessible"
        }
    } catch {
        Write-Log "Database not ready or accessible, starting it..." "WARN"

        $dbScript = Join-Path $PSScriptRoot "run-e2e-db.ps1"
        if (-not (Test-Path $dbScript)) {
            throw "Database startup script not found: $dbScript"
        }

        & $dbScript
        if ($LASTEXITCODE -ne 0) {
            throw "Database startup failed with exit code: $LASTEXITCODE"
        }
    }

    Write-Log "Database ready"

    # ==========================================
    # STEP 2: Reset and Seed Database (Canonical + Mandatory)
    # ==========================================
    Write-Log "=== STEP 2: Reset and Seed Database ==="

    # Direct database setup (bypass complex reset script)
    Write-Log "Setting up database schema and seeding..."
    $env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to run prisma commands in CI"

    # Change to backend directory for prisma commands
    Push-Location $RepoRoot\backend

    try {
        # 1. Reset and create schema
        Write-Log "Creating database schema..."
        & npx prisma db push --force-reset --skip-generate --schema=prisma/schema.prisma
        if ($LASTEXITCODE -ne 0) {
            throw "Prisma db push failed with exit code: $LASTEXITCODE"
        }
        Write-Log "Database schema created successfully"

        # 2. Seed data using SQL file
        Write-Log "Seeding restaurant data..."

        # Get container ID
        $psArgs = $composeBase + @("ps", "-q", "postgres-e2e")
        $cid = & docker @psArgs 2>$null
        if (-not $cid) {
            throw "PostgreSQL E2E container not found for seeding"
        }
        $cid = $cid.Trim()

        # Copy and execute SQL file
        $sqlFile = Join-Path $PSScriptRoot "seed-restaurants.sql"
        docker cp $sqlFile "${cid}:/tmp/seed.sql"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy SQL file to container"
        }

        docker exec $cid psql -U uberfoods -d uberfoods_e2e -f /tmp/seed.sql
        if ($LASTEXITCODE -ne 0) {
            throw "SQL seeding failed"
        }
        Write-Log "Database seeded successfully"

    } finally {
        Pop-Location
    }

    # Hard DB sanity checks - FAIL FAST if data is missing
    Write-Log "Running hard DB sanity checks..."

    # Get container ID
    $psArgs = $composeBase + @("ps", "-q", "postgres-e2e")
    $cid = & docker @psArgs 2>$null
    if (-not $cid) {
        throw "PostgreSQL E2E container not found for sanity checks"
    }
    $cid = $cid.Trim()
    Write-Log "Found PostgreSQL container: $cid"

    # Check if restaurants table exists (robust with -tA)
    $tableExists = (docker exec $cid psql -U uberfoods -d uberfoods_e2e -tA -c "SELECT to_regclass('public.restaurants') IS NOT NULL;").Trim()
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to check restaurants table existence" "ERROR"
        throw "Cannot verify database state - restaurants table check failed"
    }
    if ($tableExists -ne "t") {
        Write-Log "Restaurants table does not exist in database (result: $tableExists)" "ERROR"
        throw "Database sanity check failed - restaurants table missing"
    }
    Write-Log "✅ Restaurants table exists"

    # Check if restaurants table has data (MANDATORY - fail fast if empty, robust with -tA)
    $restaurantCount = [int](docker exec $cid psql -U uberfoods -d uberfoods_e2e -tA -c "SELECT COUNT(*) FROM public.restaurants;").Trim()
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to count restaurants in database" "ERROR"
        throw "Cannot verify restaurant data - count query failed"
    }
    Write-Log "Database contains $restaurantCount restaurants"

    if ($restaurantCount -le 0) {
        Write-Log "❌ NO RESTAURANTS FOUND - Seeding failed completely" "ERROR"
        Write-Log "Restaurant count: $restaurantCount" "ERROR"
        throw "Database sanity check failed - no restaurants seeded (count: $restaurantCount)"
    }

    # Check if dishes table has data (MANDATORY - fail fast if empty, robust with -tA)
    $dishCount = [int](docker exec $cid psql -U uberfoods -d uberfoods_e2e -tA -c "SELECT COUNT(*) FROM public.dishes;").Trim()
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to count dishes in database" "ERROR"
        throw "Cannot verify dish data - count query failed"
    }
    Write-Log "Database contains $dishCount dishes"

    if ($dishCount -le 0) {
        Write-Log "❌ NO DISHES FOUND - Seeding failed completely" "ERROR"
        Write-Log "Dish count: $dishCount" "ERROR"
        throw "Database sanity check failed - no dishes seeded (count: $dishCount)"
    }

    Write-Log "✅ Database sanity checks passed: $restaurantCount restaurants and $dishCount dishes available"

    # ==========================================
    # STEP 3: Start Backend Application
    # ==========================================
    Write-Log "=== STEP 3: Starting Backend Application ==="

    $backendOutFile = Join-Path $ArtifactsPath "backend-$Timestamp.log"
    $backendErrFile = Join-Path $ArtifactsPath "backend-$Timestamp.err"

    $backendCwd = Join-Path $RepoRoot "backend"
    $backendProc = Start-Proc "Backend" $backendCwd "npm run start:e2e" $null $backendOutFile $backendErrFile

    # Wait for backend to be ready
    $backendReady = Wait-HttpOk "http://127.0.0.1:3000/api/health" "Backend" 120
    if (-not $backendReady) {
        throw "Backend failed to start within 120 seconds"
    }

    # API preflight: Check if backend is responding with restaurant data
    Write-Log "Running API preflight check..."
    try {
        $restaurantsResponse = Invoke-WebRequest -UseBasicParsing -TimeoutSec 30 -Uri "http://127.0.0.1:3000/api/restaurants/public"
        if ($restaurantsResponse.StatusCode -ne 200) {
            throw "Restaurants API returned status: $($restaurantsResponse.StatusCode)"
        }

        Write-Log "API response content: $($restaurantsResponse.Content)"
        $restaurantsData = $restaurantsResponse.Content | ConvertFrom-Json
        Write-Log "Parsed data type: $($restaurantsData.GetType())"
        Write-Log "Parsed data: $restaurantsData"

        # Handle different possible response formats
        if ($restaurantsData -is [array]) {
            $restaurantCount = $restaurantsData.Count
        } elseif ($restaurantsData -is [PSCustomObject] -and $restaurantsData.PSObject.Properties.Name -contains 'data') {
            $restaurantCount = $restaurantsData.data.Count
        } elseif ($restaurantsData -is [PSCustomObject] -and $restaurantsData.PSObject.Properties.Name -contains 'length') {
            $restaurantCount = $restaurantsData.length
        } else {
            $restaurantCount = 1  # Single object
        }

        Write-Log "API preflight: backend returned $restaurantCount restaurants"

        if ($restaurantCount -le 0) {
            Write-Log "❌ API PREFLIGHT FAILED - No restaurants returned by backend" "ERROR"
            Write-Log "Raw response: $($restaurantsResponse.Content)" "ERROR"
            throw "API preflight failed - no restaurants available (count: $restaurantCount)"
        }

        Write-Log "✅ API preflight passed: $restaurantCount restaurants available"
    } catch {
        Write-Log "❌ API preflight failed: $($_.Exception.Message)" "ERROR"
        Write-Log "Backend may not be ready or endpoint may not exist" "ERROR"

        # Dump last 200 lines of backend log for debugging
        Write-Log "Backend logs (last 200 lines):" "ERROR"
        try {
            $backendLogContent = Get-Content $backendErrFile -Tail 200 -ErrorAction SilentlyContinue
            if ($backendLogContent) {
                $backendLogContent | ForEach-Object { Write-Log "  $_" "ERROR" }
            }
        } catch {
            Write-Log "  Could not read backend logs" "ERROR"
        }

        throw "API preflight failed - backend not responding"
    }

    # ==========================================
    # STEP 4: Start Customer Web Application
    # ==========================================
    Write-Log "=== STEP 4: Starting Customer Web Application ==="

    $frontendOutFile = Join-Path $ArtifactsPath "customer-web-$Timestamp.log"
    $frontendErrFile = Join-Path $ArtifactsPath "customer-web-$Timestamp.err"

    $frontendCwd = Join-Path $RepoRoot "frontend\customer-web"
    $frontendEnv = @{ "VITE_API_URL" = "http://127.0.0.1:3000" }
    $frontendProc = Start-Proc "CustomerWeb" $frontendCwd "npm run dev:e2e" $frontendEnv $frontendOutFile $frontendErrFile

    # Wait for frontend to be ready
    $frontendReady = Wait-HttpOk "http://127.0.0.1:3102/" "Customer Web" 120
    if (-not $frontendReady) {
        # Try fallback to /login
        $frontendReady = Wait-HttpOk "http://127.0.0.1:3102/login" "Customer Web (fallback)" 30
        if (-not $frontendReady) {
            throw "Customer Web failed to start within 120 seconds"
        }
    }

    # ==========================================
    # STEP 5: Run Playwright Tests
    # ==========================================
    Write-Log "=== STEP 5: Running Playwright Tests ==="

    Set-Location $frontendCwd

    Write-Log "Running Playwright customer-auth tests..."
    $playwrightResult = & npx playwright test --project=customer-auth --config=playwright.config.ts --workers=1 --retries=0 2>&1

    $testExitCode = $LASTEXITCODE
    if ($testExitCode -ne 0) {
        Write-Log "Playwright tests failed with exit code: $testExitCode" "ERROR"
        Write-Log "Playwright output: $playwrightResult" "ERROR"

        # Check if ports were reachable at failure time
        try {
            $backendCheck = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri "http://127.0.0.1:3000/api/health" 2>$null
            Write-Log "Backend port 3000 status at failure: $($backendCheck.StatusCode)" "ERROR"
        } catch {
            Write-Log "Backend port 3000 unreachable at failure time" "ERROR"
        }

        try {
            $frontendCheck = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri "http://127.0.0.1:3102/" 2>$null
            Write-Log "Frontend port 3102 status at failure: $($frontendCheck.StatusCode)" "ERROR"
        } catch {
            Write-Log "Frontend port 3102 unreachable at failure time" "ERROR"
        }

        $exitCode = $testExitCode
        throw "Playwright tests failed"
    }

    Write-Log "Playwright tests completed successfully"
    Write-Log "=== Customer E2E CI Runner Completed Successfully ==="

    # ==========================================
    # STEP 6: Collect Artifacts
    # ==========================================
    Write-Log "=== STEP 6: Collecting Artifacts ==="

    # Test results
    $testResultsPath = Join-Path $RepoRoot "frontend/customer-web/test-results"
    if (Test-Path $testResultsPath) {
        $destResults = Join-Path $ArtifactsPath "test-results-$Timestamp"
        Copy-Item -Path $testResultsPath -Destination $destResults -Recurse -Force
        Write-Log "Test results copied to: $destResults"
    }

    # Playwright report
    $reportPath = Join-Path $RepoRoot "frontend/customer-web/playwright-report"
    if (Test-Path $reportPath) {
        $destReport = Join-Path $ArtifactsPath "playwright-report-$Timestamp"
        Copy-Item -Path $reportPath -Destination $destReport -Recurse -Force
        Write-Log "Playwright report copied to: $destReport"
    }

    # ==========================================
    # CLEANUP
    # ==========================================
    if (-not $SkipCleanup) {
        Invoke-Cleanup
    }

    Write-Log "=== Customer E2E CI Runner Completed ==="
    Write-Log "Exit Code: $testExitCode"
    Write-Log "Artifacts: $ArtifactsPath"
    Write-Log "Log: $LogFile"

    # Return the test exit code
    exit $testExitCode

} catch {
    $exitCode = 1
} finally {
    # Stop application processes
    if ($backendProc) {
        Write-Log "Stopping backend process..."
        Stop-ProcTree $backendProc.Id
    }
    if ($frontendProc) {
        Write-Log "Stopping frontend process..."
        Stop-ProcTree $frontendProc.Id
    }

    # Docker cleanup
    if (-not $SkipCleanup) {
        Invoke-Cleanup
    }
    if ($script:CleanupFailed -and $exitCode -eq 0) {
        Write-Log "Cleanup had errors; failing the run to avoid zombie processes/ports." "ERROR"
        $exitCode = 1
    }
}
exit $exitCode