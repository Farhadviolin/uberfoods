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

function Get-AccessTokenFromResponse {
  param(
    [Parameter(Mandatory = $true)]
    $ResponseJson
  )

  if ($null -eq $ResponseJson) {
    return $null
  }

  if ($ResponseJson.data -and $ResponseJson.data.access_token) {
    return $ResponseJson.data.access_token
  }
  if ($ResponseJson.access_token) {
    return $ResponseJson.access_token
  }
  if ($ResponseJson.accessToken) {
    return $ResponseJson.accessToken
  }
  if ($ResponseJson.token) {
    return $ResponseJson.token
  }

  return $null
}

function Get-CustomerIdFromResponse {
  param(
    [Parameter(Mandatory = $false)]
    $ResponseJson
  )

  if ($null -eq $ResponseJson) {
    return $null
  }

  $id = $null

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.user -and $ResponseJson.data.user.id) {
    $id = $ResponseJson.data.user.id
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.customer -and $ResponseJson.data.customer.id) {
    $id = $ResponseJson.data.customer.id
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.profile -and $ResponseJson.data.profile.id) {
    $id = $ResponseJson.data.profile.id
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.id) {
    $id = $ResponseJson.data.id
  }

  if (-not $id -and $ResponseJson.user -and $ResponseJson.user.id) {
    $id = $ResponseJson.user.id
  }

  if (-not $id -and $ResponseJson.customer -and $ResponseJson.customer.id) {
    $id = $ResponseJson.customer.id
  }

  if (-not $id -and $ResponseJson.profile -and $ResponseJson.profile.id) {
    $id = $ResponseJson.profile.id
  }

  if (-not $id -and $ResponseJson.id) {
    $id = $ResponseJson.id
  }

  return $id
}

function Get-OrderIdFromResponse {
  param(
    [Parameter(Mandatory = $false)]
    $ResponseJson
  )

  if ($null -eq $ResponseJson) {
    return $null
  }

  $id = $null

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.id) {
    $id = $ResponseJson.data.id
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.order -and $ResponseJson.data.order.id) {
    $id = $ResponseJson.data.order.id
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.orderId) {
    $id = $ResponseJson.data.orderId
  }

  if (-not $id -and $ResponseJson.order -and $ResponseJson.order.id) {
    $id = $ResponseJson.order.id
  }

  if (-not $id -and $ResponseJson.orderId) {
    $id = $ResponseJson.orderId
  }

  if (-not $id -and $ResponseJson.id) {
    $id = $ResponseJson.id
  }

  return $id
}

function Get-OrderStatusFromResponse {
  param(
    [Parameter(Mandatory = $false)]
    $ResponseJson
  )

  if ($null -eq $ResponseJson) {
    return $null
  }

  $status = $null

  if (-not $status -and $ResponseJson.data -and $ResponseJson.data.status) {
    $status = $ResponseJson.data.status
  }

  if (-not $status -and $ResponseJson.data -and $ResponseJson.data.order -and $ResponseJson.data.order.status) {
    $status = $ResponseJson.data.order.status
  }

  if (-not $status -and $ResponseJson.order -and $ResponseJson.order.status) {
    $status = $ResponseJson.order.status
  }

  if (-not $status -and $ResponseJson.status) {
    $status = $ResponseJson.status
  }

  return $status
}

function Wait-ForBackend {
  param([int]$MaxWaitSeconds = 60)

  Write-Host "⏳ Waiting for backend to be ready..." -ForegroundColor Yellow

  $startTime = Get-Date
  $timeout = $startTime.AddSeconds($MaxWaitSeconds)

  while ((Get-Date) -lt $timeout) {
    try {
      $health = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/health"
      $healthStatus = $null
      if ($health.Json -and $health.Json.data -and $health.Json.data.status) {
        $healthStatus = $health.Json.data.status
      } elseif ($health.Json -and $health.Json.status) {
        $healthStatus = $health.Json.status
      }

      if ($health.Status -eq 200 -and $healthStatus -eq "ok") {
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
$accessToken = Get-AccessTokenFromResponse -ResponseJson $login.Json
if (-not $accessToken) {
    Write-Host "❌ Driver login failed - no access token in response" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Driver Login: $($login.Status)" -ForegroundColor Green
Write-Host "   Access Token: $($accessToken.Substring(0, 50))..." -ForegroundColor White

# Test 2a: Admin Login for order status updates
Write-Host "`n2a. Testing Admin Login..." -ForegroundColor Yellow
$adminEmail = if ($env:ADMIN_TEST_EMAIL) { $env:ADMIN_TEST_EMAIL } else { "ci-admin@example.test" }
$adminPassword = if ($env:ADMIN_TEST_PASSWORD) { $env:ADMIN_TEST_PASSWORD } else { "ci-admin-password-placeholder" }
$adminLogin = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/login" -Body @{
    email = $adminEmail
    password = $adminPassword
    userType = "admin"
}
$adminToken = Get-AccessTokenFromResponse -ResponseJson $adminLogin.Json
if ($adminLogin.Status -notin @(200, 201) -or -not $adminToken) {
    Write-Host "❌ Admin Login Failed: status=$($adminLogin.Status), emailConfigured=$([bool]$adminEmail), response=$($adminLogin.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Admin Login: $($adminLogin.Status)" -ForegroundColor Green

# Test 2b: Customer Login for order creation
Write-Host "`n2b. Testing Customer Login..." -ForegroundColor Yellow
$customerEmail = "final-verification-" + [guid]::NewGuid().ToString("N").Substring(0, 12) + "@smoke.local"
$customerPassword = "SmokeTest123!"
$customerRegister = $null
try {
    $customerRegister = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/customer/register" -Body @{
        email = $customerEmail
        password = $customerPassword
        firstName = "Final"
        lastName = "Verification"
        phone = "+43123456789"
    }
} catch {
    # Registration can be skipped if the account already exists from a prior run.
}

$customerLogin = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/customer/login" -Body @{
    email = $customerEmail
    password = $customerPassword
}
$customerToken = Get-AccessTokenFromResponse -ResponseJson $customerLogin.Json
if ($customerLogin.Status -notin @(200, 201) -or -not $customerToken) {
    Write-Host "❌ Customer Login Failed: $($customerLogin.Status) $($customerLogin.Body)" -ForegroundColor Red
    exit 1
}
$customerId = Get-CustomerIdFromResponse -ResponseJson $customerRegister.Json
if (-not $customerId) {
    $customerId = Get-CustomerIdFromResponse -ResponseJson $customerLogin.Json
}
if (-not $customerId -and $customerToken) {
    $customerProfile = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/customers/profile" -Headers @{
        Authorization = "Bearer $customerToken"
    }
    $customerId = Get-CustomerIdFromResponse -ResponseJson $customerProfile.Json
}
if (-not $customerId) {
    Write-Host "❌ Customer ID could not be resolved." -ForegroundColor Red
    if ($customerRegister.Json) {
        Write-Host "   Register response keys: $($customerRegister.Json.PSObject.Properties.Name -join ', ')" -ForegroundColor White
    }
    if ($customerLogin.Json) {
        Write-Host "   Login response keys: $($customerLogin.Json.PSObject.Properties.Name -join ', ')" -ForegroundColor White
    }
    exit 1
}
$customerId = [string]$customerId
Write-Host "✅ Customer Login: $($customerLogin.Status)" -ForegroundColor Green

Write-Host "`n2c. Loading Restaurant + Dish..." -ForegroundColor Yellow
$restaurants = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/restaurants/public"
$restaurantList = @()
if ($restaurants.Json.data) { $restaurantList = @($restaurants.Json.data) } else { $restaurantList = @($restaurants.Json) }
$restaurantId = $restaurantList[0].id
if (-not $restaurantId) { $restaurantId = $restaurantList[0].restaurantId }
if (-not $restaurantId) {
    Write-Host "❌ Restaurant lookup failed: no restaurant found" -ForegroundColor Red
    exit 1
}
$dishes = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/dishes/restaurant/$restaurantId"
$dishList = @()
if ($dishes.Json.data) { $dishList = @($dishes.Json.data) } else { $dishList = @($dishes.Json) }
$dishId = $dishList[0].id
if (-not $dishId) {
    Write-Host "❌ Dish lookup failed: no dish found for restaurant $restaurantId" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Loaded restaurant/dish: $restaurantId / $dishId" -ForegroundColor Green

# Test 3: Driver Authentication (401 without token, 200 with token)
Write-Host "`n3. Testing Driver Authentication RBAC..." -ForegroundColor Yellow

# Test without token against a protected driver endpoint (should return 401)
$noAuth = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/drivers/orders/test123/accept"
if ($noAuth.Status -ne 401) {
    Write-Host "❌ RBAC expected 401 without token, got $($noAuth.Status): $($noAuth.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Driver Auth (no token): 401 (correct)" -ForegroundColor Green

# Test with token against a protected driver endpoint (should authenticate, then fail on missing order)
$withAuth = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/drivers/orders/test123/accept" -Headers @{
    Authorization = "Bearer $accessToken"
}
if ($withAuth.Status -notin @(400, 404)) {
    Write-Host "❌ Driver Auth with token failed: $($withAuth.Status) $($withAuth.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Driver Auth (with token): $($withAuth.Status)" -ForegroundColor Green
Write-Host "   Protected endpoint accepted token, returned expected order error" -ForegroundColor White

# Test 4: E2E Order Lifecycle
Write-Host "`n4. Testing E2E Order Lifecycle..." -ForegroundColor Yellow

# Step 1: Customer creates order (201)
Write-Host "   Step 1: Customer creates order..." -ForegroundColor Cyan
$order = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/orders" -Body @{
    customerId = $customerId
    restaurantId = $restaurantId
    items = @(
        @{
            dishId = $dishId
            quantity = 10
        }
    )
} -Headers @{
    Authorization = "Bearer $customerToken"
}
if ($order.Status -ne 201) {
    Write-Host "❌ Order Creation Failed: $($order.Status) $($order.Body)" -ForegroundColor Red
    exit 1
}
$orderId = Get-OrderIdFromResponse -ResponseJson $order.Json
if (-not $orderId) {
    Write-Host "❌ Order ID could not be resolved." -ForegroundColor Red
    if ($order.Json) {
        Write-Host "   Order response top-level keys: $($order.Json.PSObject.Properties.Name -join ', ')" -ForegroundColor White
        if ($order.Json.data) {
            Write-Host "   Order response data keys: $($order.Json.data.PSObject.Properties.Name -join ', ')" -ForegroundColor White
        }
    }
    throw "Order verification failed - no orderId resolved"
}
$orderId = [string]$orderId
Write-Host "✅ Order Created: $($order.Status) - ID: $orderId" -ForegroundColor Green

# Step 2: Restaurant sets order to READY_FOR_PICKUP (200)
Write-Host "   Step 2: Restaurant sets READY_FOR_PICKUP..." -ForegroundColor Cyan
if (-not $orderId -or [string]::IsNullOrWhiteSpace($orderId)) {
    throw "Cannot update order status because orderId is empty"
}
$ready = Invoke-CurlJson -Method "PATCH" -Url "$baseUrl/api/orders/$orderId/status" -Headers @{
    Authorization = "Bearer $adminToken"
} -Body @{
    status = "READY_FOR_PICKUP"
}
$readyStatus = Get-OrderStatusFromResponse -ResponseJson $ready.Json
if ($ready.Status -ne 200 -or $readyStatus -ne "READY_FOR_PICKUP") {
    Write-Host "Restaurant Status Update response did not match expected status." -ForegroundColor Red
    if ($ready.Json) {
        Write-Host "Status response top-level keys: $($ready.Json.PSObject.Properties.Name -join ', ')" -ForegroundColor White
        if ($ready.Json.data) {
            Write-Host "Status response data keys: $($ready.Json.data.PSObject.Properties.Name -join ', ')" -ForegroundColor White
        }
    }
    throw "Restaurant Status Update Failed: $($ready.Status)"
}
Write-Host "✅ Order Status Updated: $($ready.Status) - Status: $readyStatus" -ForegroundColor Green

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
$deliver = Invoke-CurlJson -Method "PUT" -Url "$baseUrl/api/drivers/orders/$orderId/status" -Headers @{
    Authorization = "Bearer $accessToken"
} -Body @{
    status = "DELIVERED"
}
$deliveredStatus = Get-OrderStatusFromResponse -ResponseJson $deliver.Json
if ($deliver.Status -ne 200 -or $deliveredStatus -ne "DELIVERED") {
    Write-Host "Delivery Status Update response did not match expected status." -ForegroundColor Yellow
    if ($deliver.Json) {
        Write-Host "Delivery response top-level keys: $($deliver.Json.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        if ($deliver.Json.data) {
            Write-Host "Delivery response data keys: $($deliver.Json.data.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        }
    }
    Write-Host "❌ Delivery Status Update Failed: $($deliver.Status) $($deliver.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Order Delivered: $($deliver.Status) - Status: $deliveredStatus" -ForegroundColor Green

# Step 5: Admin verifies final order status (200)
Write-Host "   Step 5: Admin verifies final status..." -ForegroundColor Cyan
$admin = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/orders/$orderId" -Headers @{
    Authorization = "Bearer $adminToken"
}
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
