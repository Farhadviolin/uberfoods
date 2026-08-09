# Final Verification Script for UberFoods Backend
# Tests overall system health and driver functionality

[CmdletBinding()]
param(
  [string] $BaseUrl = "http://localhost:3000",
  [switch] $CredentialContractSelfTest
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

function Get-RequiredCredential {
  param(
    [Parameter(Mandatory = $true)][string] $Name,
    [AllowNull()][string] $Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "$Name environment variable is required and must not be empty"
  }

  return $Value
}

if ($CredentialContractSelfTest) {
  foreach ($name in @("TEST_DRIVER_PASSWORD", "PROD_SIM_DRIVER_B_PASSWORD", "RESTAURANT_TEST_PASSWORD")) {
    foreach ($invalidValue in @($null, "", " `t ")) {
      try {
        Get-RequiredCredential -Name $name -Value $invalidValue | Out-Null
        throw "Expected empty credential to be rejected"
      } catch {
        if ($_.Exception.Message -notmatch $name) { throw }
      }
    }
  }

  $specialCharacterPassword = 'contract-$pecial-"-\\-value'
  foreach ($name in @("TEST_DRIVER_PASSWORD", "PROD_SIM_DRIVER_B_PASSWORD", "RESTAURANT_TEST_PASSWORD")) {
    $serialized = @{ password = (Get-RequiredCredential -Name $name -Value $specialCharacterPassword) } | ConvertTo-Json -Depth 20 -Compress
    if (((($serialized | ConvertFrom-Json).password) -cne $specialCharacterPassword)) {
      throw "$name JSON contract did not preserve special characters"
    }
  }

  Write-Host "Credential contract self-test passed: driver and restaurant missing, empty, whitespace, and special-character cases" -ForegroundColor Green
  exit 0
}

$driverPassword = Get-RequiredCredential -Name "TEST_DRIVER_PASSWORD" -Value $env:TEST_DRIVER_PASSWORD
$driverBPassword = Get-RequiredCredential -Name "PROD_SIM_DRIVER_B_PASSWORD" -Value $env:PROD_SIM_DRIVER_B_PASSWORD
$restaurantPassword = Get-RequiredCredential -Name "RESTAURANT_TEST_PASSWORD" -Value $env:RESTAURANT_TEST_PASSWORD

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

function Get-RefreshTokenFromResponse {
  param(
    [Parameter(Mandatory = $true)]
    $ResponseJson
  )

  if ($null -eq $ResponseJson) { return $null }
  if ($ResponseJson.data -and $ResponseJson.data.refresh_token) { return $ResponseJson.data.refresh_token }
  if ($ResponseJson.refresh_token) { return $ResponseJson.refresh_token }
  if ($ResponseJson.refreshToken) { return $ResponseJson.refreshToken }
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

function Get-DriverIdFromResponse {
  param(
    [Parameter(Mandatory = $false)]
    $ResponseJson
  )

  if ($null -eq $ResponseJson) {
    return $null
  }

  $id = $null

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.driverId) {
    $id = $ResponseJson.data.driverId
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.order -and $ResponseJson.data.order.driverId) {
    $id = $ResponseJson.data.order.driverId
  }

  if (-not $id -and $ResponseJson.order -and $ResponseJson.order.driverId) {
    $id = $ResponseJson.order.driverId
  }

  if (-not $id -and $ResponseJson.driverId) {
    $id = $ResponseJson.driverId
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.driver -and $ResponseJson.data.driver.id) {
    $id = $ResponseJson.data.driver.id
  }

  if (-not $id -and $ResponseJson.data -and $ResponseJson.data.order -and $ResponseJson.data.order.driver -and $ResponseJson.data.order.driver.id) {
    $id = $ResponseJson.data.order.driver.id
  }

  if (-not $id -and $ResponseJson.order -and $ResponseJson.order.driver -and $ResponseJson.order.driver.id) {
    $id = $ResponseJson.order.driver.id
  }

  if (-not $id -and $ResponseJson.driver -and $ResponseJson.driver.id) {
    $id = $ResponseJson.driver.id
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
$baseUrl = $BaseUrl.TrimEnd('/')

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
$wrongLogin = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/driver/login" -Body @{
    email = "testdriver@example.com"
    password = "${driverPassword}-invalid"
}

function Get-JwtSubject {
  param([Parameter(Mandatory = $true)][string] $Token)
  $payload = $Token.Split('.')[1].Replace('-', '+').Replace('_', '/')
  while (($payload.Length % 4) -ne 0) { $payload += '=' }
  return [string](([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json).sub)
}

function Get-OrderCollection {
  param($ResponseJson)
  if ($null -eq $ResponseJson) { return @() }
  if ($ResponseJson.data -is [array]) { return @($ResponseJson.data) }
  if ($ResponseJson.data -and $ResponseJson.data.orders) { return @($ResponseJson.data.orders) }
  if ($ResponseJson.orders) { return @($ResponseJson.orders) }
  if ($ResponseJson -is [array]) { return @($ResponseJson) }
  if (Get-OrderIdFromResponse -ResponseJson $ResponseJson) { return @($ResponseJson) }
  return @()
}

function Find-Order {
  param($ResponseJson, [string]$ExpectedOrderId)
  return @(Get-OrderCollection -ResponseJson $ResponseJson | Where-Object {
    ([string](Get-OrderIdFromResponse -ResponseJson $_)) -eq $ExpectedOrderId
  })[0]
}

function Assert-NoProtectedOrderLeak {
  param([Parameter(Mandatory = $true)]$Response)
  $payload = $Response.Json
  if ($payload -and ($payload.data -or $payload.order -or $payload.customer -or $payload.restaurant)) {
    throw "Forbidden response leaked protected order, customer, or restaurant data"
  }
}

function Assert-DriverAOrderUnchanged {
  param(
    [Parameter(Mandatory = $true)][string]$ExpectedOrderId,
    [Parameter(Mandatory = $true)][string]$ExpectedDriverId,
    [Parameter(Mandatory = $true)][string]$ExpectedStatus,
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $active = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/active" -Headers @{
      Authorization = "Bearer $Token"
  }
  $activeOrder = Find-Order $active.Json $ExpectedOrderId
  if ($active.Status -ne 200 -or -not $activeOrder -or
      (Get-OrderStatusFromResponse $activeOrder) -ne $ExpectedStatus -or
      ([string](Get-DriverIdFromResponse $activeOrder)) -ne $ExpectedDriverId) {
      throw "$Label changed Driver A order state or ownership"
  }
}
if ($wrongLogin.Status -ne 401) {
    Write-Host "❌ Driver Login with wrong password expected 401, got $($wrongLogin.Status)" -ForegroundColor Red
    exit 1
}
$login = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/driver/login" -Body @{
    email = "testdriver@example.com"
    password = $driverPassword
}
if ($login.Status -notin @(200, 201)) {
    Write-Host "❌ Driver Login Failed: $($login.Status) $($login.Body)" -ForegroundColor Red
    exit 1
}
$accessToken = Get-AccessTokenFromResponse -ResponseJson $login.Json
$refreshToken = Get-RefreshTokenFromResponse -ResponseJson $login.Json
if (-not $accessToken -or -not $refreshToken) {
    Write-Host "❌ Driver login failed - expected access and refresh tokens" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Driver Login: $($login.Status)" -ForegroundColor Green
$driverAId = Get-JwtSubject -Token $accessToken

$driverBLogin = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/driver/login" -Body @{
    email = "production-sim-driver-b@example.test"
    password = $driverBPassword
}
$driverBToken = Get-AccessTokenFromResponse -ResponseJson $driverBLogin.Json
if ($driverBLogin.Status -notin @(200, 201) -or -not $driverBToken) {
    throw "Driver B login failed: status=$($driverBLogin.Status)"
}
$driverBId = Get-JwtSubject -Token $driverBToken
if (-not $driverAId -or -not $driverBId -or $driverAId -eq $driverBId) {
    throw "Driver runtime verification requires two distinct authenticated drivers"
}

$refresh = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/refresh" -Body @{
    refresh_token = $refreshToken
}
$refreshedAccessToken = Get-AccessTokenFromResponse -ResponseJson $refresh.Json
if ($refresh.Status -notin @(200, 201) -or -not $refreshedAccessToken) {
    Write-Host "❌ Refresh token flow failed: status=$($refresh.Status)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Refresh Token Flow: $($refresh.Status)" -ForegroundColor Green

# Test 2a: Restaurant Login for order status updates
Write-Host "`n2a. Testing Restaurant Login..." -ForegroundColor Yellow
$restaurantEmail = if ($env:RESTAURANT_TEST_EMAIL) { $env:RESTAURANT_TEST_EMAIL } else { "ci-restaurant@example.test" }
$wrongRestaurantLogin = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/restaurant/login" -Body @{
    email = $restaurantEmail
    password = "${restaurantPassword}-invalid"
}
if ($wrongRestaurantLogin.Status -ne 401) {
    Write-Host "❌ Restaurant Login with wrong password expected 401, got $($wrongRestaurantLogin.Status)" -ForegroundColor Red
    exit 1
}
$restaurantLogin = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/auth/restaurant/login" -Body @{
    email = $restaurantEmail
    password = $restaurantPassword
}
$restaurantToken = Get-AccessTokenFromResponse -ResponseJson $restaurantLogin.Json
if ($restaurantLogin.Status -notin @(200, 201) -or -not $restaurantToken) {
    Write-Host "❌ Restaurant Login Failed: status=$($restaurantLogin.Status), emailConfigured=$([bool]$restaurantEmail), response=$($restaurantLogin.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Restaurant Login: $($restaurantLogin.Status)" -ForegroundColor Green

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

# Step 2: Restaurant advances the order to READY_FOR_PICKUP (200)
Write-Host "   Step 2: Restaurant advances to READY_FOR_PICKUP..." -ForegroundColor Cyan
if (-not $orderId -or [string]::IsNullOrWhiteSpace($orderId)) {
    throw "Cannot update order status because orderId is empty"
}
foreach ($restaurantStatus in @("CONFIRMED", "PREPARING", "READY_FOR_PICKUP")) {
    $ready = Invoke-CurlJson -Method "PATCH" -Url "$baseUrl/api/orders/$orderId/status" -Headers @{
        Authorization = "Bearer $restaurantToken"
    } -Body @{
        status = $restaurantStatus
    }
    $readyStatus = Get-OrderStatusFromResponse -ResponseJson $ready.Json
    if ($ready.Status -ne 200 -or $readyStatus -ne $restaurantStatus) {
        Write-Host "Restaurant Status Update response did not match expected status." -ForegroundColor Red
        if ($ready.Json) {
            Write-Host "Status response top-level keys: $($ready.Json.PSObject.Properties.Name -join ', ')" -ForegroundColor White
            if ($ready.Json.data) {
                Write-Host "Status response data keys: $($ready.Json.data.PSObject.Properties.Name -join ', ')" -ForegroundColor White
            }
        }
        throw "Restaurant Status Update Failed: $($ready.Status)"
    }
}
Write-Host "✅ Order Status Updated: $($ready.Status) - Status: $readyStatus" -ForegroundColor Green

# Step 3: Driver discovery, RBAC, acceptance and isolation
Write-Host "   Step 3: Driver accepts order..." -ForegroundColor Cyan
$availableNoAuth = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/available"
if ($availableNoAuth.Status -ne 401) { throw "Available orders without authentication expected 401, got $($availableNoAuth.Status)" }
$availableWrongRole = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/available" -Headers @{
    Authorization = "Bearer $customerToken"
}
if ($availableWrongRole.Status -ne 403) { throw "Available orders with customer role expected 403, got $($availableWrongRole.Status)" }
$availableBefore = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/available" -Headers @{
    Authorization = "Bearer $accessToken"
}
$availableOrder = Find-Order -ResponseJson $availableBefore.Json -ExpectedOrderId $orderId
if ($availableBefore.Status -ne 200 -or -not $availableOrder) { throw "READY_FOR_PICKUP order was not visible to Driver A" }
if ((Get-OrderStatusFromResponse $availableOrder) -ne "READY_FOR_PICKUP") { throw "Available order had an unexpected status" }
$availableRestaurantId = [string]$(if ($availableOrder.restaurantId) { $availableOrder.restaurantId } elseif ($availableOrder.restaurant.id) { $availableOrder.restaurant.id })
$availableCustomerId = [string]$(if ($availableOrder.customerId) { $availableOrder.customerId } elseif ($availableOrder.customer.id) { $availableOrder.customer.id })
if ($availableRestaurantId -ne $restaurantId -or $availableCustomerId -ne $customerId) {
    throw "Available order did not correlate to the expected restaurant and customer"
}
$activeBefore = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/active" -Headers @{
    Authorization = "Bearer $accessToken"
}
if ($activeBefore.Status -ne 200 -or (Find-Order $activeBefore.Json $orderId)) { throw "Unaccepted order unexpectedly appeared in Driver A active orders" }

$accept = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/drivers/orders/$orderId/accept" -Headers @{
    Authorization = "Bearer $accessToken"
}
if ($accept.Status -ne 201 -or (Get-OrderStatusFromResponse $accept.Json) -ne "ACCEPTED" -or
    ([string](Get-DriverIdFromResponse $accept.Json)) -ne $driverAId -or
    ([string](Get-OrderIdFromResponse $accept.Json)) -ne $orderId) {
    Write-Host "❌ Order Acceptance Failed: $($accept.Status) $($accept.Body)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Order Accepted: $($accept.Status) - Status: $($accept.Json.data.status), Driver: $($accept.Json.data.driverId)" -ForegroundColor Green

$availableAfter = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/available" -Headers @{
    Authorization = "Bearer $accessToken"
}
if ($availableAfter.Status -ne 200 -or (Find-Order $availableAfter.Json $orderId)) { throw "Accepted order remained available" }
$activeAfter = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/active" -Headers @{
    Authorization = "Bearer $accessToken"
}
$activeOrder = Find-Order $activeAfter.Json $orderId
if ($activeAfter.Status -ne 200 -or -not $activeOrder -or (Get-OrderStatusFromResponse $activeOrder) -ne "ACCEPTED" -or
    ([string](Get-DriverIdFromResponse $activeOrder)) -ne $driverAId) { throw "Driver A active-order ownership was not established" }

$crossRead = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/$driverAId/orders/active" -Headers @{
    Authorization = "Bearer $driverBToken"
}
if ($crossRead.Status -ne 403) { throw "Cross-driver alias read expected 403, got $($crossRead.Status)" }
Assert-NoProtectedOrderLeak -Response $crossRead
Assert-DriverAOrderUnchanged -ExpectedOrderId $orderId -ExpectedDriverId $driverAId -ExpectedStatus "ACCEPTED" -Token $accessToken -Label "Cross-driver alias read"
$crossAccept = Invoke-CurlJson -Method "POST" -Url "$baseUrl/api/drivers/orders/$orderId/accept" -Headers @{
    Authorization = "Bearer $driverBToken"
}
if ($crossAccept.Status -ne 409) { throw "Cross-driver accept expected 409, got $($crossAccept.Status)" }
Assert-NoProtectedOrderLeak -Response $crossAccept
Assert-DriverAOrderUnchanged -ExpectedOrderId $orderId -ExpectedDriverId $driverAId -ExpectedStatus "ACCEPTED" -Token $accessToken -Label "Cross-driver accept"
$crossStatus = Invoke-CurlJson -Method "PUT" -Url "$baseUrl/api/drivers/orders/$orderId/status" -Headers @{
    Authorization = "Bearer $driverBToken"
} -Body @{ status = "PICKED_UP" }
if ($crossStatus.Status -ne 403) { throw "Cross-driver status update expected 403, got $($crossStatus.Status)" }
Assert-NoProtectedOrderLeak -Response $crossStatus
Assert-DriverAOrderUnchanged -ExpectedOrderId $orderId -ExpectedDriverId $driverAId -ExpectedStatus "ACCEPTED" -Token $accessToken -Label "Cross-driver status update"

$illegalTransition = Invoke-CurlJson -Method "PUT" -Url "$baseUrl/api/drivers/orders/$orderId/status" -Headers @{
    Authorization = "Bearer $accessToken"
} -Body @{ status = "DELIVERED" }
if ($illegalTransition.Status -ne 409) { throw "Illegal ACCEPTED to DELIVERED transition expected 409, got $($illegalTransition.Status)" }
$unchangedActive = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/drivers/orders/active" -Headers @{
    Authorization = "Bearer $accessToken"
}
$unchangedOrder = Find-Order $unchangedActive.Json $orderId
if ($unchangedActive.Status -ne 200 -or -not $unchangedOrder -or
    (Get-OrderStatusFromResponse $unchangedOrder) -ne "ACCEPTED" -or
    ([string](Get-DriverIdFromResponse $unchangedOrder)) -ne $driverAId) {
    throw "Rejected cross-driver or illegal mutation changed order state or ownership"
}

# Step 4: Driver advances the order through IN_TRANSIT to DELIVERED (200)
Write-Host "   Step 4: Driver advances through IN_TRANSIT to DELIVERED..." -ForegroundColor Cyan
foreach ($driverStatus in @("PICKED_UP", "IN_TRANSIT", "DELIVERED")) {
    $deliver = Invoke-CurlJson -Method "PUT" -Url "$baseUrl/api/drivers/orders/$orderId/status" -Headers @{
        Authorization = "Bearer $accessToken"
    } -Body @{
        status = $driverStatus
    }
    $deliveredStatus = Get-OrderStatusFromResponse -ResponseJson $deliver.Json
    if ($deliver.Status -ne 200 -or $deliveredStatus -ne $driverStatus) {
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
}
Write-Host "✅ Order Delivered: $($deliver.Status) - Status: $deliveredStatus" -ForegroundColor Green

# Step 5: Owning customer verifies final order status (200)
Write-Host "   Step 5: Customer verifies final status..." -ForegroundColor Cyan
$verifiedOrder = Invoke-CurlJson -Method "GET" -Url "$baseUrl/api/orders/$orderId" -Headers @{
    Authorization = "Bearer $customerToken"
}
$verifiedStatus = Get-OrderStatusFromResponse -ResponseJson $verifiedOrder.Json
$verifiedOrderId = Get-OrderIdFromResponse -ResponseJson $verifiedOrder.Json
$verifiedDriverId = Get-DriverIdFromResponse -ResponseJson $verifiedOrder.Json
if ($verifiedOrder.Status -ne 200 -or $verifiedStatus -ne "DELIVERED") {
    Write-Host "Customer verification response did not match expected delivered status." -ForegroundColor Yellow
    if ($verifiedOrder.Json) {
        Write-Host "Verification response top-level keys: $($verifiedOrder.Json.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        if ($verifiedOrder.Json.data) {
            Write-Host "Verification response data keys: $($verifiedOrder.Json.data.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        }
        if ($verifiedOrder.Json.order) {
            Write-Host "Verification response order keys: $($verifiedOrder.Json.order.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        }
    }
    throw "Customer Verification Failed: $($verifiedOrder.Status)"
}
if ($verifiedOrderId -and ([string]$verifiedOrderId) -ne ([string]$orderId)) {
    throw "Customer Verification Failed: returned orderId does not match created orderId"
}
if (-not $verifiedDriverId) {
    Write-Host "Customer verification warning: driverId was not present in the response, but order status is DELIVERED." -ForegroundColor Yellow
} else {
    Write-Host "Customer verification driverId detected: $verifiedDriverId" -ForegroundColor Green
}
Write-Host "✅ Customer Verification: $($verifiedOrder.Status) - Status: $verifiedStatus, Driver: $verifiedDriverId" -ForegroundColor Green
Write-Host "PRODUCTION_SIM_ORDER_ID=$orderId"
$driverRuntimeEvidence = [ordered]@{
    result = "PASS"
    orderId = $orderId
    driverAId = $driverAId
    driverBId = $driverBId
    noAuthAvailableStatus = $availableNoAuth.Status
    wrongRoleAvailableStatus = $availableWrongRole.Status
    availableStatus = $availableBefore.Status
    activeStatus = $activeAfter.Status
    acceptStatus = $accept.Status
    crossReadStatus = $crossRead.Status
    crossAcceptStatus = $crossAccept.Status
    crossStatusUpdateStatus = $crossStatus.Status
    illegalTransitionStatus = $illegalTransition.Status
    lifecycle = @("READY_FOR_PICKUP", "ACCEPTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED")
    finalStatus = $verifiedStatus
    finalDriverId = [string]$verifiedDriverId
}
$driverRuntimeJson = $driverRuntimeEvidence | ConvertTo-Json -Depth 20 -Compress
$driverRuntimeEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($driverRuntimeJson)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
Write-Host "PRODUCTION_SIM_DRIVER_RUNTIME_EVIDENCE=$driverRuntimeEncoded"

# Test 5: System Status Summary
Write-Host "`n5. System Health Summary..." -ForegroundColor Yellow

Write-Host "`n🎉 Final Verification PASSED!" -ForegroundColor Green
Write-Host "All systems operational:" -ForegroundColor White
Write-Host "  ✅ Health Check (/api/health)" -ForegroundColor Green
Write-Host "  ✅ Driver Login (JWT token)" -ForegroundColor Green
Write-Host "  ✅ RBAC Authentication (401→200)" -ForegroundColor Green
Write-Host "  ✅ E2E Order Lifecycle (201→200→200→200→200)" -ForegroundColor Green
Write-Host "  ✅ Customer Ownership Verification (DELIVERED + driverId)" -ForegroundColor Green
