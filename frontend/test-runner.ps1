# ============================================
# UberFoods - UI-E2E Test Runner (PowerShell)
# ============================================
# Runs full order lifecycle across all frontend apps

param(
    [switch]$SkipBackendCheck,
    [switch]$SkipFrontendCheck,
    [int]$BackendTimeout = 60,
    [int]$FrontendTimeout = 30
)

# Set error handling
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Generate unique run ID for test isolation
$RUN_ID = $env:RUN_ID
if (-not $RUN_ID) {
    $RUN_ID = "$(Get-Date -UFormat %s)_$([System.Random]::new().Next(10000,99999))"
}
$env:RUN_ID = $RUN_ID

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Cyan"
$White = "White"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $White
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "🚀 Starting UberFoods UI-E2E Test Runner" $Blue
Write-ColorOutput "🆔 Run ID: $RUN_ID" $Blue
Write-ColorOutput "==============================================" $White

# Function to check if port is available
function Test-Port {
    param(
        [int]$Port,
        [string]$Service
    )

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 5 -ErrorAction Stop
        Write-ColorOutput "✅ $Service is running on port $Port" $Green
        return $true
    }
    catch {
        Write-ColorOutput "❌ $Service is NOT running on port $Port" $Red
        return $false
    }
}

# Function to wait for service with timeout
function Wait-ForService {
    param(
        [int]$Port,
        [string]$Service,
        [int]$Timeout = 30
    )

    Write-ColorOutput "⏳ Waiting for $Service on port $Port..." $Yellow

    $count = 0
    while ($count -lt $Timeout) {
        if (Test-Port -Port $Port -Service $Service) {
            return $true
        }
        Start-Sleep -Seconds 1
        $count++
    }

    Write-ColorOutput "❌ Timeout waiting for $Service" $Red
    return $false
}

# Check Backend API
if (-not $SkipBackendCheck) {
    Write-ColorOutput "🔍 Checking Backend API..." $Blue
    if (-not (Wait-ForService -Port 3000 -Service "Backend API" -Timeout $BackendTimeout)) {
        Write-ColorOutput "❌ Backend not ready. Please start with:" $Red
        Write-ColorOutput "   cd backend; npm run start:e2e" $Yellow
        exit 1
    }

    # Verify API health endpoint
    Write-ColorOutput "🔍 Verifying API health..." $Blue
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -ErrorAction Stop
        Write-ColorOutput "✅ API health check passed" $Green
    }
    catch {
        Write-ColorOutput "❌ API health check failed" $Red
        exit 1
    }
}

# Check Frontend Apps
if (-not $SkipFrontendCheck) {
    Write-ColorOutput "🔍 Checking Frontend Apps..." $Blue

    # Customer Web
    if (-not (Wait-ForService -Port 3001 -Service "Customer Web" -Timeout $FrontendTimeout)) {
        Write-ColorOutput "⚠️  Customer Web not running, will start automatically" $Yellow
    }

    # Admin Panel
    if (-not (Wait-ForService -Port 3002 -Service "Admin Panel" -Timeout $FrontendTimeout)) {
        Write-ColorOutput "⚠️  Admin Panel not running, will start automatically" $Yellow
    }

    # Restaurant Web
    if (-not (Wait-ForService -Port 3003 -Service "Restaurant Web" -Timeout $FrontendTimeout)) {
        Write-ColorOutput "⚠️  Restaurant Web not running, will start automatically" $Yellow
    }

    # Driver App
    if (-not (Wait-ForService -Port 3004 -Service "Driver App" -Timeout $FrontendTimeout)) {
        Write-ColorOutput "⚠️  Driver App not running, will start automatically" $Yellow
    }
}

Write-ColorOutput "🎯 Running Full Order Lifecycle UI-E2E Test" $Blue
Write-ColorOutput "==================================================" $White

# Change to customer-web directory and run the test
Push-Location "customer-web"

try {
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-ColorOutput "📦 Installing dependencies..." $Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install dependencies"
        }
    }

    # Setup authentication states
    Write-ColorOutput "🔐 Setting up authentication states..." $Yellow
    npm run test:setup-auth

    # Run the full lifecycle test with run ID
    Write-ColorOutput "🚀 Executing test: full-order-lifecycle.spec.ts" $Blue
    $env:RUN_ID = $RUN_ID
    npx playwright test full-order-lifecycle.spec.ts --reporter=line

    # Check test result
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "" $White
        Write-ColorOutput "🎉 SUCCESS: Full Order Lifecycle UI-E2E Test Passed!" $Green
        Write-ColorOutput "==================================================" $White
        Write-ColorOutput "✅ Customer → Restaurant → Driver → Admin flow completed" $Green
        Write-ColorOutput "✅ All frontend apps coordinated successfully" $Green
        Write-ColorOutput "✅ Order lifecycle: PENDING → READY_FOR_PICKUP → IN_TRANSIT → DELIVERED" $Green
        exit 0
    }
    else {
        Write-ColorOutput "" $White
        Write-ColorOutput "❌ FAILURE: UI-E2E Test Failed" $Red
        Write-ColorOutput "==================================" $White
        Write-ColorOutput "💡 Check Playwright report: customer-web/playwright-report/index.html" $Yellow
        Write-ColorOutput "💡 Check screenshots: customer-web/test-results/" $Yellow
        exit 1
    }
}
finally {
    Pop-Location
}
