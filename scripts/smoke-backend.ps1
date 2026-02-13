# UberFoods Backend Smoke Tests
# Run this script to verify backend is working correctly

Write-Host "🚀 UberFoods Backend Smoke Tests" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$url,
        [string]$method = "GET",
        [string]$description
    )

    Write-Host "Testing: $description" -ForegroundColor Yellow
    Write-Host "URL: $url" -ForegroundColor Gray

    try {
        $response = Invoke-RestMethod -Uri $url -Method $method -TimeoutSec 10
        Write-Host "✅ SUCCESS: $($response.status)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
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
    Write-Host "URL: $baseUrl/auth/$endpoint" -ForegroundColor Gray

    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/$endpoint" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
        Write-Host "✅ SUCCESS: Login successful" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Health Check
Write-Host "`n1. Health Check" -ForegroundColor Magenta
$healthSuccess = Test-Endpoint -url "$baseUrl/health" -description "Backend Health Check"

if (-not $healthSuccess) {
    Write-Host "❌ CRITICAL: Backend health check failed. Backend may not be running." -ForegroundColor Red
    exit 1
}

# Test 2: Admin Login
Write-Host "`n2. Admin Authentication" -ForegroundColor Magenta
$adminToken = Test-AuthEndpoint -endpoint "login" -email "admin@uberfoods.local" -password "Admin123!" -description "Admin Login"

if ($adminToken) {
    $adminAuthHeader = @{ Authorization = "Bearer $($adminToken.access_token)" }
}

# Test 3: Restaurant Login
Write-Host "`n3. Restaurant Authentication" -ForegroundColor Magenta
$restaurantToken = Test-AuthEndpoint -endpoint "restaurant/login" -email "restaurant@uberfoods.local" -password "Restaurant123!" -description "Restaurant Login"

if ($restaurantToken) {
    $restaurantAuthHeader = @{ Authorization = "Bearer $($restaurantToken.access_token)" }
}

# Test 4: Customer Login
Write-Host "`n4. Customer Authentication" -ForegroundColor Magenta
$customerToken = Test-AuthEndpoint -endpoint "customer/login" -email "customer@uberfoods.local" -password "Customer123!" -description "Customer Login"

if ($customerToken) {
    $customerAuthHeader = @{ Authorization = "Bearer $($customerToken.access_token)" }
}

# Test 5: Public Restaurants List
Write-Host "`n5. Public Restaurants API" -ForegroundColor Magenta
$restaurantsSuccess = Test-Endpoint -url "$baseUrl/restaurants" -description "Get Public Restaurants List"

# Test 6: Admin Customers List
Write-Host "`n6. Admin Customers API" -ForegroundColor Magenta
if ($adminAuthHeader) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/admin/customers" -Method GET -Headers $adminAuthHeader -TimeoutSec 10
        Write-Host "✅ SUCCESS: Admin customers list retrieved" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ SKIPPED: Admin auth failed" -ForegroundColor Yellow
}

# Test 7: Admin Restaurants List
Write-Host "`n7. Admin Restaurants API" -ForegroundColor Magenta
if ($adminAuthHeader) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/admin/restaurants" -Method GET -Headers $adminAuthHeader -TimeoutSec 10
        Write-Host "✅ SUCCESS: Admin restaurants list retrieved" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ SKIPPED: Admin auth failed" -ForegroundColor Yellow
}

# Test 8: Admin Orders List
Write-Host "`n8. Admin Orders API" -ForegroundColor Magenta
if ($adminAuthHeader) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/admin/orders" -Method GET -Headers $adminAuthHeader -TimeoutSec 10
        Write-Host "✅ SUCCESS: Admin orders list retrieved" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ SKIPPED: Admin auth failed" -ForegroundColor Yellow
}

# Test 9: Restaurant Orders List
Write-Host "`n9. Restaurant Orders API" -ForegroundColor Magenta
if ($restaurantToken) {
    # Get restaurant ID from token or assume first restaurant
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/restaurants" -Method GET -TimeoutSec 10
        if ($response.data -and $response.data.Count -gt 0) {
            $restaurantId = $response.data[0].id
            Write-Host "Using restaurant ID: $restaurantId" -ForegroundColor Gray

            $restaurantOrdersResponse = Invoke-RestMethod -Uri "$baseUrl/restaurants/$restaurantId/orders" -Method GET -Headers $restaurantAuthHeader -TimeoutSec 10
            Write-Host "✅ SUCCESS: Restaurant orders retrieved" -ForegroundColor Green
        } else {
            Write-Host "⚠️ SKIPPED: No restaurants found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ SKIPPED: Restaurant auth failed" -ForegroundColor Yellow
}

# Test 10: Swagger Documentation
Write-Host "`n10. API Documentation" -ForegroundColor Magenta
$swaggerSuccess = Test-Endpoint -url "$baseUrl/docs" -description "Swagger API Documentation"

Write-Host "`n🎉 Smoke tests completed!" -ForegroundColor Cyan
Write-Host "Check the results above for any failures." -ForegroundColor Cyan