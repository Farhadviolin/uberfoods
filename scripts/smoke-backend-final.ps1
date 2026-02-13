# UberFoods Baseline Smoke Tests - FINAL VERSION
# Run this script to verify the localhost baseline is working

Write-Host "🚀 UberFoods Baseline Smoke Tests" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

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
    Write-Host "Login: $email" -ForegroundColor Gray

    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
        Write-Host "✅ SUCCESS: Login successful" -ForegroundColor Green
        return @{ success = $true; token = $response.access_token; user = $response.user }
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return @{ success = $false; error = $_.Exception.Message }
    }
}

# Track results
$results = @{}

# Test 1: Health Check
Write-Host "`n🏥 1. Backend Health Check" -ForegroundColor Magenta
$healthResult = Test-Endpoint -url "$baseUrl/health" -description "Backend Health Check"
$results["health"] = $healthResult.success

# Test 2: Admin Login
Write-Host "`n🔐 2. Admin Authentication" -ForegroundColor Magenta
$adminAuth = Test-AuthEndpoint -endpoint "login" -email "admin@uberfoods.local" -password "Admin123!" -description "Admin Login"
$results["admin_login"] = $adminAuth.success
$adminToken = if ($adminAuth.success) { $adminAuth.token } else { $null }

# Test 3: Restaurant Login
Write-Host "`n🍕 3. Restaurant Authentication" -ForegroundColor Magenta
$restaurantAuth = Test-AuthEndpoint -endpoint "login" -email "restaurant@uberfoods.local" -password "Restaurant123!" -description "Restaurant Login"
$results["restaurant_login"] = $restaurantAuth.success
$restaurantToken = if ($restaurantAuth.success) { $restaurantAuth.token } else { $null }

# Test 4: Customer Login
Write-Host "`n👤 4. Customer Authentication" -ForegroundColor Magenta
$customerAuth = Test-AuthEndpoint -endpoint "login" -email "customer@uberfoods.local" -password "Customer123!" -description "Customer Login"
$results["customer_login"] = $customerAuth.success
$customerToken = if ($customerAuth.success) { $customerAuth.token } else { $null }

# Test 5: Public Restaurants List
Write-Host "`n🏪 5. Public Restaurants API" -ForegroundColor Magenta
$restaurantsResult = Test-Endpoint -url "$baseUrl/restaurants" -description "Get Public Restaurants List"
$results["restaurants_public"] = $restaurantsResult.success

# Test 6: Restaurant Details
Write-Host "`n📋 6. Restaurant Details API" -ForegroundColor Magenta
$restaurantDetailResult = Test-Endpoint -url "$baseUrl/restaurants/restaurant-1" -description "Get Restaurant Details"
$results["restaurant_detail"] = $restaurantDetailResult.success

# Test 7: Admin Customers List
Write-Host "`n👥 7. Admin Customers API" -ForegroundColor Magenta
if ($adminToken) {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $adminCustomersResult = Test-Endpoint -url "$baseUrl/admin/customers" -description "Admin Get Customers" -headers $headers
    $results["admin_customers"] = $adminCustomersResult.success
} else {
    Write-Host "⚠️ SKIPPED: Admin auth failed" -ForegroundColor Yellow
    $results["admin_customers"] = $false
}

# Test 8: Admin Restaurants List
Write-Host "`n🏪 8. Admin Restaurants API" -ForegroundColor Magenta
if ($adminToken) {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $adminRestaurantsResult = Test-Endpoint -url "$baseUrl/admin/restaurants" -description "Admin Get Restaurants" -headers $headers
    $results["admin_restaurants"] = $adminRestaurantsResult.success
} else {
    Write-Host "⚠️ SKIPPED: Admin auth failed" -ForegroundColor Yellow
    $results["admin_restaurants"] = $false
}

# Test 9: Admin Orders List
Write-Host "`n📦 9. Admin Orders API" -ForegroundColor Magenta
if ($adminToken) {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $adminOrdersResult = Test-Endpoint -url "$baseUrl/admin/orders" -description "Admin Get Orders" -headers $headers
    $results["admin_orders"] = $adminOrdersResult.success
} else {
    Write-Host "⚠️ SKIPPED: Admin auth failed" -ForegroundColor Yellow
    $results["admin_orders"] = $false
}

# Test 10: Customer Order Creation
Write-Host "`n🛒 10. Customer Order Creation" -ForegroundColor Magenta
if ($customerToken) {
    $headers = @{ Authorization = "Bearer $customerToken" }
    $orderBody = @{
        restaurantId = "restaurant-1"
        totalAmount = 19.00
        items = @(
            @{
                dishId = "dish-1"
                quantity = 2
                price = 8.50
            }
        )
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/orders" -Method POST -Body $orderBody -ContentType "application/json" -Headers $headers -TimeoutSec 10
        Write-Host "✅ SUCCESS: Order created" -ForegroundColor Green
        $results["customer_order"] = $true
        $orderId = $response.id
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $results["customer_order"] = $false
        $orderId = $null
    }
} else {
    Write-Host "⚠️ SKIPPED: Customer auth failed" -ForegroundColor Yellow
    $results["customer_order"] = $false
}

# Test 11: Restaurant Orders List
Write-Host "`n🍽️ 11. Restaurant Orders API" -ForegroundColor Magenta
if ($restaurantToken) {
    $headers = @{ Authorization = "Bearer $restaurantToken" }
    $restaurantOrdersResult = Test-Endpoint -url "$baseUrl/restaurant/orders" -description "Restaurant Get Orders" -headers $headers
    $results["restaurant_orders"] = $restaurantOrdersResult.success
} else {
    Write-Host "⚠️ SKIPPED: Restaurant auth failed" -ForegroundColor Yellow
    $results["restaurant_orders"] = $false
}

# Test 12: Order Status Update
Write-Host "`n🔄 12. Order Status Update" -ForegroundColor Magenta
if ($restaurantToken -and $orderId) {
    $headers = @{ Authorization = "Bearer $restaurantToken" }
    $statusBody = @{ status = "PREPARING" } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/orders/$orderId/status" -Method PATCH -Body $statusBody -ContentType "application/json" -Headers $headers -TimeoutSec 10
        Write-Host "✅ SUCCESS: Order status updated" -ForegroundColor Green
        $results["order_status_update"] = $true
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $results["order_status_update"] = $false
    }
} else {
    Write-Host "⚠️ SKIPPED: Restaurant auth or order creation failed" -ForegroundColor Yellow
    $results["order_status_update"] = $false
}

# Summary
Write-Host "`n🎯 BASELINE TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$passed = 0
$failed = 0
$skipped = 0

foreach ($test in $results.Keys) {
    $result = $results[$test]
    if ($result -eq $true) {
        $passed++
        Write-Host "✅ $test" -ForegroundColor Green
    } elseif ($result -eq $false) {
        $failed++
        Write-Host "❌ $test" -ForegroundColor Red
    } else {
        $skipped++
        Write-Host "⚠️ $test (skipped)" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Results: $passed passed, $failed failed, $skipped skipped" -ForegroundColor White

if ($failed -eq 0) {
    Write-Host "`n🎉 LOCALHOST BASELINE SUCCESS! All core endpoints are working." -ForegroundColor Green
    Write-Host "You can now:" -ForegroundColor White
    Write-Host "• Open admin panel: http://localhost:3002" -ForegroundColor White
    Write-Host "• Open customer web: http://localhost:5173" -ForegroundColor White
    Write-Host "• Open restaurant web: http://localhost:3003" -ForegroundColor White
    Write-Host "• View API docs: http://localhost:3000/api/docs" -ForegroundColor White
} else {
    Write-Host "`n⚠️ Some tests failed. Check the output above for details." -ForegroundColor Yellow
}