# Final Verification Script for UberFoods Backend
# Tests overall system health and driver functionality

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

function Invoke-CurlJson {
  param(
    [Parameter(Mandatory)] [string] $Method,
    [Parameter(Mandatory)] [string] $Url,
    [hashtable] $Headers = @{},
    [object] $Body = $null
  )

  # Choose curl executable based on platform
  $curlCmd = if ($IsWindows -or $PSVersionTable.PSVersion.Major -lt 7) { "curl.exe" } else { "curl" }

  $hFile = New-TemporaryFile
  $bFile = New-TemporaryFile
  $jsonFile = $null

  $args = @("-sS", "-D", $hFile.FullName, "-o", $bFile.FullName, "-X", $Method)

  foreach ($k in $Headers.Keys) {
    $args += @("-H", "${k}: $($Headers[$k])")
  }

  if ($null -ne $Body) {
    if ($Body -is [string]) {
      $json = $Body
    } else {
      $json = ($Body | ConvertTo-Json -Depth 20 -Compress)
    }

    # Write JSON to UTF-8 no-BOM temp file to avoid encoding issues
    $jsonFile = New-TemporaryFile
    [System.IO.File]::WriteAllText($jsonFile.FullName, $json, [System.Text.UTF8Encoding]::new($false))
    $args += @("-H", "Content-Type: application/json", "--data-binary", "@$($jsonFile.FullName)")
  }

  $args += $Url

  & $curlCmd @args | Out-Null

  $statusLine = (Get-Content $hFile.FullName -TotalCount 1)
  $status = 0
  if ($statusLine -match "HTTP/\S+\s+(\d+)") { $status = [int]$Matches[1] }

  $bodyText = Get-Content $bFile.FullName -Raw
  $jsonObj = $null
  try { $jsonObj = $bodyText | ConvertFrom-Json -ErrorAction Stop } catch {}

  Remove-Item $hFile, $bFile -Force
  if ($jsonFile) { Remove-Item $jsonFile -Force }

  [pscustomobject]@{
    Status = $status
    Body   = $bodyText
    Json   = $jsonObj
  }
}

function Wait-ForBackend {
  param([int]$MaxWaitSeconds = 60)

  Write-Host "⏳ Waiting for backend to be ready..." -ForegroundColor Yellow

  $startTime = Get-Date
  $timeout = $startTime.AddSeconds($MaxWaitSeconds)

  while ((Get-Date) -lt $timeout) {
    try {
      $health = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/health"
      if ($health.Status -eq 200 -and $health.Json.status -eq "ok") {
        $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
        Write-Host "✅ Backend ready after ${elapsed}s" -ForegroundColor Green
        return $true
      }
    } catch {
      # Backend not ready yet
    }

    Start-Sleep -Seconds 2
  }

  Write-Host "❌ Backend failed to start within ${MaxWaitSeconds}s" -ForegroundColor Red
  return $false
}

Write-Host "🚀 Starting Final Verification..." -ForegroundColor Green
$baseUrl = "http://localhost:3000"

# Wait for backend to be ready
if (-not (Wait-ForBackend -MaxWaitSeconds 60)) {
  Write-Host "❌ Backend not ready - aborting tests" -ForegroundColor Red
  exit 1
}

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
$health = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/health"
if ($health.Status -ne 200) {
    Write-Host "❌ Health Check Failed: $($health.Status) $($health.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Health Check: $($health.Status) - Status: $($health.Json.status)" -ForegroundColor Green

# Test 2: Driver Login (should return 200 + access_token)
Write-Host "`n2. Testing Driver Login..." -ForegroundColor Yellow
$login = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/driver/login" -Body @{
    email = "testdriver@example.com"
    password = "password123"
}
if ($login.Status -notin @(200, 201)) {
    Write-Host "❌ Driver Login Failed: $($login.Status) $($login.Body)" -ForegroundColor Red
    exit 1
}
if (-not $login.Json.data.access_token) {
    Write-Host "❌ Driver login failed - no access token in response" -ForegroundColor Red
    exit 1
}
$accessToken = $login.Json.data.access_token
Write-Host "✅ Driver Login: $($login.Status)" -ForegroundColor Green
Write-Host "   Access Token: $($accessToken.Substring(0, 50))..." -ForegroundColor White

# Test 3: Driver Authentication (401 without token, 200 with token)
Write-Host "`n3. Testing Driver Authentication RBAC..." -ForegroundColor Yellow

# Test without token (should return 401)
$noAuth = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/available"
if ($noAuth.Status -ne 401) {
    Write-Host "❌ RBAC expected 401 without token, got $($noAuth.Status): $($noAuth.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Driver Auth (no token): 401 (correct)" -ForegroundColor Green

# Test with token (should return 200)
$withAuth = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/available" -Headers @{
    Authorization = "Bearer $accessToken"
}
if ($withAuth.Status -ne 200) {
    Write-Host "❌ Driver Auth with token failed: $($withAuth.Status) $($withAuth.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Driver Auth (with token): $($withAuth.Status)" -ForegroundColor Green
Write-Host "   Available Orders: $($withAuth.Json.data.count)" -ForegroundColor White

# Test 4: E2E Order Lifecycle
Write-Host "`n4. Testing E2E Order Lifecycle..." -ForegroundColor Yellow

# Step 1: Customer creates order (201)
Write-Host "   Step 1: Customer creates order..." -ForegroundColor Cyan
$order = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/orders" -Body @{
    customerId = "customer_test_123"
    restaurantId = "restaurant_test_123"
    items = @(
        @{
            dishId = "dish_test_123"
            quantity = 2
            price = 12.99
        }
    )
    totalAmount = 25.99
}
if ($order.Status -ne 201) {
    Write-Host "❌ Order Creation Failed: $($order.Status) $($order.Body)" -ForegroundColor Red
    exit 1
}
$orderId = $order.Json.data.id
Write-Host "✅ Order Created: $($order.Status) - ID: $orderId" -ForegroundColor Green

# Step 2: Restaurant sets order to READY_FOR_PICKUP (200)
Write-Host "   Step 2: Restaurant sets READY_FOR_PICKUP..." -ForegroundColor Cyan
$ready = Invoke-CurlJson -Method "PUT" -Url "$baseUrl/api/restaurants/orders/$orderId/status" -Body @{
    status = "READY_FOR_PICKUP"
}
if ($ready.Status -ne 200 -or $ready.Json.data.status -ne "READY_FOR_PICKUP") {
    Write-Host "❌ Restaurant Status Update Failed: $($ready.Status) $($ready.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Order Status Updated: $($ready.Status) - Status: $($ready.Json.data.status)" -ForegroundColor Green

# Step 3: Driver accepts order (200/201)
Write-Host "   Step 3: Driver accepts order..." -ForegroundColor Cyan
$accept = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/drivers/orders/$orderId/accept" -Headers @{
    Authorization = "Bearer $accessToken"
}
if ($accept.Status -notin @(200, 201)) {
    Write-Host "❌ Order Acceptance Failed: $($accept.Status) $($accept.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Order Accepted: $($accept.Status) - Status: $($accept.Json.data.status), Driver: $($accept.Json.data.driverId)" -ForegroundColor Green

# Step 4: Driver marks order as DELIVERED (200)
Write-Host "   Step 4: Driver marks DELIVERED..." -ForegroundColor Cyan
$deliver = Invoke-CurlJson -Method "PATCH" -Url "$baseUrl/api/drivers/orders/$orderId/status" -Headers @{
    Authorization = "Bearer $accessToken"
} -Body @{
    status = "DELIVERED"
}
if ($deliver.Status -ne 200 -or $deliver.Json.data.status -ne "DELIVERED") {
    Write-Host "❌ Delivery Status Update Failed: $($deliver.Status) $($deliver.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Order Delivered: $($deliver.Status) - Status: $($deliver.Json.data.status)" -ForegroundColor Green

# Step 5: Admin verifies final order status (200)
Write-Host "   Step 5: Admin verifies final status..." -ForegroundColor Cyan
$admin = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/admin/orders/$orderId"
if ($admin.Status -ne 200 -or $admin.Json.data.status -ne "DELIVERED" -or !$admin.Json.data.driverId) {
    Write-Host "❌ Admin Verification Failed: $($admin.Status) $($admin.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Admin Verification: $($admin.Status) - Status: $($admin.Json.data.status), Driver: $($admin.Json.data.driverId)" -ForegroundColor Green

# Test 5: System Status Summary
Write-Host "`n5. System Health Summary..." -ForegroundColor Yellow

Write-Host "`n🎉 Final Verification PASSED!" -ForegroundColor Green
Write-Host "All systems operational:" -ForegroundColor White
Write-Host "  ✅ Health Check (/api/health)" -ForegroundColor Green
Write-Host "  ✅ Driver Login (JWT token)" -ForegroundColor Green
Write-Host "  ✅ RBAC Authentication (401→200)" -ForegroundColor Green
Write-Host "  ✅ E2E Order Lifecycle (201→200→200→200→200)" -ForegroundColor Green
Write-Host "  ✅ Admin Verification (DELIVERED + driverId)" -ForegroundColor Green
