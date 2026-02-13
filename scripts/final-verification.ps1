# UberFoods REAL Prisma Backend - Final Verification
# Tests the complete localhost baseline with real database

Write-Host "🚀 UberFoods REAL Backend - Final Verification" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$url,
        [string]$method = "GET",
        [string]$description,
        [hashtable]$headers = @{}
    )

    Write-Host "Testing: $description" -ForegroundColor Yellow
    Write-Host "URL: $url" -ForegroundColor Gray

    try {
        $response = Invoke-RestMethod -Uri $url -Method $method -Headers $headers -TimeoutSec 10
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        return @{ success = $true; data = $response }
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return @{ success = $false; error = $_.Exception.Message }
    }
}

# Function to test auth endpoint
function Test-AuthEndpoint {
    param(
        [string]$endpoint,
        [string]$email,
        [string]$password,
        [string]$description
    )

    Write-Host "Testing: $description" -ForegroundColor Yellow

    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/$endpoint" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
        if ($response.access_token) {
            Write-Host "✅ SUCCESS" -ForegroundColor Green
            return @{ success = $true; token = $response.access_token }
        } else {
            Write-Host "❌ FAILED: No token in response" -ForegroundColor Red
            return @{ success = $false; error = "No token in response" }
        }
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return @{ success = $false; error = $_.Exception.Message }
    }
}

Write-Host "`n🔍 PHASE 1: Backend Infrastructure" -ForegroundColor Magenta
Write-Host "==================================" -ForegroundColor Magenta

# Test Docker services
Write-Host "`n🐳 Docker Services:" -ForegroundColor White
$postgresRunning = docker ps | Select-String "postgres" | Measure-Object | Select-Object -ExpandProperty Count
$redisRunning = docker ps | Select-String "redis" | Measure-Object | Select-Object -ExpandProperty Count

if ($postgresRunning -gt 0) { Write-Host "✅ PostgreSQL running" -ForegroundColor Green } else { Write-Host "❌ PostgreSQL not running" -ForegroundColor Red }
if ($redisRunning -gt 0) { Write-Host "✅ Redis running" -ForegroundColor Green } else { Write-Host "⚠️ Redis not running (fallback OK)" -ForegroundColor Yellow }

# Test health endpoint
$healthResult = Test-Endpoint -url "$baseUrl/health" -description "Backend Health Check"
$healthSuccess = $healthResult.success

# Test Swagger
$swaggerResult = Test-Endpoint -url "$baseUrl/docs" -description "API Documentation"
$swaggerSuccess = $swaggerResult.success

Write-Host "`n🔐 PHASE 2: Authentication" -ForegroundColor Magenta
Write-Host "==========================" -ForegroundColor Magenta

# Test admin login
$adminLogin = Test-AuthEndpoint -endpoint "login" -email "admin@uberfoods.local" -password "Admin123!" -description "Admin Login"
$adminSuccess = $adminLogin.success
$adminToken = if ($adminLogin.success) { $adminLogin.token } else { $null }

# Test restaurant login
$restaurantLogin = Test-AuthEndpoint -endpoint "login" -email "restaurant@uberfoods.local" -password "Restaurant123!" -description "Restaurant Login"
$restaurantSuccess = $restaurantLogin.success
$restaurantToken = if ($restaurantLogin.success) { $restaurantLogin.token } else { $null }

# Test customer login
$customerLogin = Test-AuthEndpoint -endpoint "login" -email "customer@uberfoods.local" -password "Customer123!" -description "Customer Login"
$customerSuccess = $customerLogin.success
$customerToken = if ($customerLogin.success) { $customerLogin.token } else { $null }

Write-Host "`n🏪 PHASE 3: Public Endpoints" -ForegroundColor Magenta
Write-Host "===========================" -ForegroundColor Magenta

# Test public restaurants
$restaurantsResult = Test-Endpoint -url "$baseUrl/restaurants" -description "Public Restaurants List"
$restaurantsSuccess = $restaurantsResult.success

# Test restaurant details
$restaurantDetailResult = Test-Endpoint -url "$baseUrl/restaurants/restaurant-1" -description "Restaurant Details"
$restaurantDetailSuccess = $restaurantDetailResult.success

Write-Host "`n👑 PHASE 4: Admin Endpoints" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

$adminCustomersSuccess = $false
$adminRestaurantsSuccess = $false
$adminOrdersSuccess = $false

if ($adminToken) {
    $headers = @{ Authorization = "Bearer $adminToken" }

    $adminCustomersResult = Test-Endpoint -url "$baseUrl/admin/customers" -description "Admin Customers" -headers $headers
    $adminCustomersSuccess = $adminCustomersResult.success

    $adminRestaurantsResult = Test-Endpoint -url "$baseUrl/admin/restaurants" -description "Admin Restaurants" -headers $headers
    $adminRestaurantsSuccess = $adminRestaurantsResult.success

    $adminOrdersResult = Test-Endpoint -url "$baseUrl/admin/orders" -description "Admin Orders" -headers $headers
    $adminOrdersSuccess = $adminOrdersResult.success
} else {
    Write-Host "⚠️ Admin auth failed - skipping admin endpoint tests" -ForegroundColor Yellow
}

Write-Host "`n🍽️ PHASE 5: Customer Endpoints" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$customerOrderSuccess = $false
if ($customerToken) {
    $headers = @{ Authorization = "Bearer $customerToken" }

    # Create order
    $orderBody = @{
        restaurantId = "restaurant-1"
        items = @(
            @{
                dishId = "dish-1"
                quantity = 2
                price = 8.50
            }
        )
        address = "Test Address 123"
    } | ConvertTo-Json

    try {
        $orderResponse = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $orderBody -ContentType "application/json" -Headers $headers -TimeoutSec 10
        Write-Host "✅ Customer Order Creation: SUCCESS" -ForegroundColor Green
        $customerOrderSuccess = $true
        $orderId = $orderResponse.id
    }
    catch {
        Write-Host "❌ Customer Order Creation: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $customerOrderSuccess = $false
    }
} else {
    Write-Host "⚠️ Customer auth failed - skipping customer endpoint tests" -ForegroundColor Yellow
}

Write-Host "`n🏪 PHASE 6: Restaurant Endpoints" -ForegroundColor Magenta
Write-Host "==============================" -ForegroundColor Magenta

$restaurantOrdersSuccess = $false
$orderStatusSuccess = $false

if ($restaurantToken) {
    $headers = @{ Authorization = "Bearer $restaurantToken" }

    $restaurantOrdersResult = Test-Endpoint -url "$baseUrl/restaurant/orders" -description "Restaurant Orders" -headers $headers
    $restaurantOrdersSuccess = $restaurantOrdersResult.success

    # Test order status update if we have an order
    if ($customerOrderSuccess -and $orderId) {
        $statusBody = @{ status = "PREPARING" } | ConvertTo-Json
        try {
            $statusResponse = Invoke-RestMethod -Uri "$baseUrl/orders/$orderId/status" -Method PATCH -Body $statusBody -ContentType "application/json" -Headers $headers -TimeoutSec 10
            Write-Host "✅ Order Status Update: SUCCESS" -ForegroundColor Green
            $orderStatusSuccess = $true
        }
        catch {
            Write-Host "❌ Order Status Update: FAILED - $($_.Exception.Message)" -ForegroundColor Red
            $orderStatusSuccess = $false
        }
    }
} else {
    Write-Host "⚠️ Restaurant auth failed - skipping restaurant endpoint tests" -ForegroundColor Yellow
}

Write-Host "`n🎯 FINAL RESULTS" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

$tests = @(
    @{ Name = "Health Endpoint"; Success = $healthSuccess },
    @{ Name = "Swagger Docs"; Success = $swaggerSuccess },
    @{ Name = "Admin Login"; Success = $adminSuccess },
    @{ Name = "Restaurant Login"; Success = $restaurantSuccess },
    @{ Name = "Customer Login"; Success = $customerSuccess },
    @{ Name = "Public Restaurants"; Success = $restaurantsSuccess },
    @{ Name = "Restaurant Details"; Success = $restaurantDetailSuccess },
    @{ Name = "Admin Customers"; Success = $adminCustomersSuccess },
    @{ Name = "Admin Restaurants"; Success = $adminRestaurantsSuccess },
    @{ Name = "Admin Orders"; Success = $adminOrdersSuccess },
    @{ Name = "Customer Order Creation"; Success = $customerOrderSuccess },
    @{ Name = "Restaurant Orders"; Success = $restaurantOrdersSuccess },
    @{ Name = "Order Status Update"; Success = $orderStatusSuccess }
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    if ($test.Success) {
        $passed++
        Write-Host "✅ $($test.Name)" -ForegroundColor Green
    } else {
        $failed++
        Write-Host "❌ $($test.Name)" -ForegroundColor Red
    }
}

Write-Host "`nSummary: $passed passed, $failed failed" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host ""
    Write-Host 'COMPLETE SUCCESS! REAL Prisma backend is working perfectly!' -ForegroundColor Green
    Write-Host 'All baseline endpoints are functional with real database operations.' -ForegroundColor White
    Write-Host ""
    Write-Host 'Ready for frontend integration testing!' -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host 'Some tests failed. Check the output above for details.' -ForegroundColor Yellow
    Write-Host 'The backend may need additional configuration or the database may not be seeded properly.' -ForegroundColor Yellow
}