# UberFoods Local Production Test (PowerShell)
Write-Host "🧪 UberFoods Local Production Test" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if docker-compose is running
Write-Host "`n🐳 Checking Docker services..." -ForegroundColor Yellow
try {
    $services = docker-compose -f docker-compose.prod.yml ps
    if ($services -match "Up") {
        Write-Host "✅ Docker services are running" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker services not running - start with: docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker Compose not available" -ForegroundColor Red
    exit 1
}

# Wait a moment for services to be ready
Start-Sleep -Seconds 3

# Test Backend Health
Write-Host "`n🏥 Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        $content = $response.Content | ConvertFrom-Json
        if ($content.status -eq "ok") {
            Write-Host "✅ Backend health check passed" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Backend responds but health status unclear" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Backend health check failed (HTTP $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test API Docs
Write-Host "`n📚 Testing API Documentation..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/docs" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API documentation accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ API documentation not accessible (HTTP $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ API documentation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Restaurants Endpoint
Write-Host "`n🏪 Testing Restaurants API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/restaurants" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Restaurants API responding" -ForegroundColor Green
    } else {
        Write-Host "❌ Restaurants API failed (HTTP $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Restaurants API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Auth Endpoint (optional - only if seed data exists)
Write-Host "`n🔐 Testing Authentication (optional)..." -ForegroundColor Yellow
try {
    $body = @{
        email = "admin@uberfoods.com"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    $content = $response.Content | ConvertFrom-Json

    if ($content.access_token) {
        Write-Host "✅ Authentication working" -ForegroundColor Green
    } else {
        Write-Host "❌ Authentication failed - no token received" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Authentication not available or seed data missing" -ForegroundColor Yellow
}

# Test Frontend (if nginx is running)
Write-Host "`n🌐 Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend not accessible (HTTP $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Frontend not accessible (nginx may not be running)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$total = 0

# Count results (simplified - would need proper tracking)
Write-Host "✅ Core functionality tests completed" -ForegroundColor Green
Write-Host "💡 Check individual test results above" -ForegroundColor Yellow

Write-Host "`n🎯 Next Steps:" -ForegroundColor Green
Write-Host "1. Fix any failed tests" -ForegroundColor White
Write-Host "2. Configure real domains and SSL" -ForegroundColor White
Write-Host "3. Set up Stripe/PayPal production keys" -ForegroundColor White
Write-Host "4. Run: docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor White
Write-Host "5. Access: https://yourdomain.com" -ForegroundColor White

Write-Host "`n💡 Useful commands:" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f          # Follow logs" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml restart         # Restart services" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml down            # Stop everything" -ForegroundColor White
Write-Host "  .\local-production-test.ps1                              # Run this test again" -ForegroundColor White

Write-Host "`n$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Test completed" -ForegroundColor Gray