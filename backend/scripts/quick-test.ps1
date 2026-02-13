# Quick Test Script for Local Development
# Runs a fast subset of verification tests

Write-Host "🏃 Quick API Test Starting..." -ForegroundColor Green

# Check if backend is running
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not running. Start with: npm run start:e2e" -ForegroundColor Red
    exit 1
}

# Quick authentication test
try {
    $authTest = Invoke-WebRequest -Uri "http://localhost:3000/api/drivers/orders/available" -Method GET -TimeoutSec 5
    Write-Host "❌ Security issue: Endpoint accessible without auth" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.Value__
    if ($status -eq 401) {
        Write-Host "✅ RBAC working: 401 without authentication" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected response: $status" -ForegroundColor Red
        exit 1
    }
}

# Quick order creation test
$orderBody = @{
    customerId = "quick_test_123"
    restaurantId = "quick_rest_123"
    items = @(@{ dishId = "quick_dish_123"; quantity = 1; price = 15.99 })
    totalAmount = 15.99
} | ConvertTo-Json

try {
    $orderTest = Invoke-WebRequest -Uri "http://localhost:3000/api/orders" -Method POST -Body $orderBody -ContentType "application/json" -TimeoutSec 5
    if ($orderTest.StatusCode -eq 201) {
        Write-Host "✅ Order creation working: 201 Created" -ForegroundColor Green
    } else {
        Write-Host "❌ Order creation failed: $($orderTest.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Order creation error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Quick test passed! Run full verification with:" -ForegroundColor Green
Write-Host "pwsh -ExecutionPolicy Bypass -File ./scripts/final-verification.ps1" -ForegroundColor Cyan
