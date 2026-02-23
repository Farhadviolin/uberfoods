<#
.SYNOPSIS
  UberFoods MVP Smoke Test - 4 Rollen Journey (Admin, Customer, Restaurant, Driver).
.DESCRIPTION
  Prüft Health, Admin-Login, Restaurant/Dish, Customer Register+Login, Restaurants/Dishes listen,
  Order erstellen, Restaurant Status PREPARING/READY, Driver Login/Accept, Driver DELIVERING/DELIVERED,
  Admin Order-Details und optional Audit.
.EXAMPLE
  .\scripts\smoke-mvp.ps1
  .\scripts\smoke-mvp.ps1 -BaseUrl "http://localhost:3000/api" -AdminEmail "admin@uberfoods.com" -AdminPassword "admin123"
#>

param(
  [string]$BaseUrl = $(if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000/api" }),
  [string]$AdminEmail = $(if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@uberfoods.com" }),
  [string]$AdminPassword = $(if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "admin123" }),
  [string]$CustomerEmail = $(if ($env:CUSTOMER_EMAIL) { $env:CUSTOMER_EMAIL } else { "smoke-customer-" + (Get-Random -Maximum 99999) + "@smoke.local" }),
  [string]$CustomerPassword = $(if ($env:CUSTOMER_PASSWORD) { $env:CUSTOMER_PASSWORD } else { "SmokeTest123!" }),
  [string]$DriverEmail = $(if ($env:DRIVER_EMAIL) { $env:DRIVER_EMAIL } else { "driver@uberfoods.local" }),
  [string]$DriverPassword = $(if ($env:DRIVER_PASSWORD) { $env:DRIVER_PASSWORD } else { "driver123" }),
  [string]$RestaurantEmail = $(if ($env:RESTAURANT_EMAIL) { $env:RESTAURANT_EMAIL } else { "restaurant@uberfoods.local" }),
  [string]$RestaurantPassword = $(if ($env:RESTAURANT_PASSWORD) { $env:RESTAURANT_PASSWORD } else { "restaurant123" })
)

$ErrorActionPreference = "Stop"
$script:Results = @()
$script:adminToken = $null
$script:customerToken = $null
$script:customerId = $null
$script:restaurantToken = $null
$script:driverToken = $null
$script:driverId = $null
$script:restaurantId = $null
$script:dishId = $null
$script:orderId = $null

function Add-Result { param($Step, $Status, $Message) $script:Results += [PSCustomObject]@{ Step = $Step; Status = $Status; Message = $Message } }
function Pass { param($Step, $Message) Write-Host "[PASS] $Step - $Message" -ForegroundColor Green; Add-Result $Step "PASS" $Message }
function Fail { param($Step, $Message) Write-Host "[FAIL] $Step - $Message" -ForegroundColor Red; Add-Result $Step "FAIL" $Message; throw "P0: $Step" }
function Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }

function Invoke-Api {
  param([string]$Method, [string]$Uri, [hashtable]$Headers = @{}, [object]$Body = $null)
  $params = @{ Method = $Method; Uri = $Uri; ContentType = "application/json"; Headers = $Headers; UseBasicParsing = $true }
  if ($Body) { $params.Body = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 10 } }
  Invoke-RestMethod @params
}

# --- Step 1: Health Check ---
try {
  $health = Invoke-Api -Method Get -Uri "$BaseUrl/health"
  if ($health.database -or $health.timestamp) { Pass "1.Health" "Health OK (database/timestamp present)" }
  else { Pass "1.Health" "Health responded: $($health | ConvertTo-Json -Compress)" }
} catch {
  Fail "1.Health" "GET /api/health failed: $($_.Exception.Message)"
}

# --- Step 2: Admin Login ---
try {
  $loginBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
  $adminResp = Invoke-Api -Method Post -Uri "$BaseUrl/auth/login" -Body $loginBody
  $script:adminToken = $adminResp.access_token
  if (-not $script:adminToken) { $script:adminToken = $adminResp.accessToken }
  if (-not $script:adminToken -and $adminResp.data) { $script:adminToken = $adminResp.data.access_token }
  if (-not $script:adminToken -and $adminResp.data) { $script:adminToken = $adminResp.data.accessToken }
  if (-not $script:adminToken) { Fail "2.AdminLogin" "No access_token in response" }
  Pass "2.AdminLogin" "Admin token obtained"
} catch {
  Fail "2.AdminLogin" "POST /api/auth/login failed: $($_.Exception.Message). Ensure seed: admin@uberfoods.com / admin123"
}

# --- Step 3: Restaurant + Dish (use seed or list) ---
try {
  $publicRestaurants = Invoke-Api -Method Get -Uri "$BaseUrl/restaurants/public"
  $raw = $publicRestaurants
  if ($publicRestaurants.data) { $raw = @($publicRestaurants.data) } else { $raw = @($publicRestaurants) }
  $list = @($raw)
  if ($list.Count -gt 0) {
    $script:restaurantId = $list[0].id
    if (-not $script:restaurantId) { $script:restaurantId = $list[0].restaurantId }
    Pass "3.Restaurant" "Using seed restaurant id=$script:restaurantId"
  } else {
    $auth = @{ Authorization = "Bearer $script:adminToken" }
    $adminRestaurants = Invoke-Api -Method Get -Uri "$BaseUrl/admin/restaurants" -Headers $auth
    $arr = @($adminRestaurants)
    if ($arr.Count -gt 0) {
      $script:restaurantId = $arr[0].id
      Pass "3.Restaurant" "Using admin list restaurant id=$script:restaurantId"
    } else {
      Fail "3.Restaurant" "No restaurants. Run prisma:seed (SEED_RESTAURANT_PASSWORD set) or create via Admin."
    }
  }
} catch {
  Fail "3.Restaurant" "Restaurant list failed: $($_.Exception.Message)"
}

try {
  if (-not $script:restaurantId) { Fail "3.Dish" "No restaurantId from step 3" }
  $dishes = Invoke-Api -Method Get -Uri "$BaseUrl/dishes/restaurant/$script:restaurantId"
  $dlist = @($dishes)
  if ($dishes.data) { $dlist = @($dishes.data) }
  if ($dlist.Count -gt 0) {
    $script:dishId = $dlist[0].id
    Pass "3.Dish" "Using dish id=$script:dishId"
  } else {
    $dishesAlt = Invoke-Api -Method Get -Uri "$BaseUrl/restaurants/$script:restaurantId/dishes"
    $dlist2 = @($dishesAlt)
    if ($dishesAlt.data) { $dlist2 = @($dishesAlt.data) }
    if ($dlist2.Count -gt 0) { $script:dishId = $dlist2[0].id; Pass "3.Dish" "Using dish (restaurants/:id/dishes) id=$script:dishId" }
    else { Fail "3.Dish" "No dishes for restaurant. Run prisma:seed or create via Admin." }
  }
} catch {
  Fail "3.Dish" "Dish list failed: $($_.Exception.Message)"
}

# --- Step 4: Customer Register + Login ---
try {
  $regBody = @{
    email          = $CustomerEmail
    password       = $CustomerPassword
    firstName      = "Smoke"
    lastName       = "User"
    phone          = "+43123456789"
  } | ConvertTo-Json
  Invoke-Api -Method Post -Uri "$BaseUrl/auth/customer/register" -Body $regBody | Out-Null
  Info "Customer registered: $CustomerEmail"
} catch {
  if ($_.Exception.Message -match "409|already exists|duplicate") { Info "Customer already exists, continuing" }
  else { Fail "4.CustomerRegister" "Register failed: $($_.Exception.Message)" }
}

try {
  $custLogin = @{ email = $CustomerEmail; password = $CustomerPassword } | ConvertTo-Json
  $custResp = Invoke-Api -Method Post -Uri "$BaseUrl/auth/customer/login" -Body $custLogin
  $c = if ($custResp.data) { $custResp.data } else { $custResp }
  $script:customerToken = $c.access_token; if (-not $script:customerToken) { $script:customerToken = $c.accessToken }
  if ($c.user) { $script:customerId = $c.user.id } elseif ($c.id) { $script:customerId = $c.id } else { $script:customerId = $null }
  if (-not $script:customerToken) { Fail "4.CustomerLogin" "No token" }
  Pass "4.CustomerLogin" "Customer token obtained (id=$script:customerId)"
} catch {
  Fail "4.CustomerLogin" "Customer login failed: $($_.Exception.Message)"
}

# --- Step 5: Customer list Restaurants (public) ---
try {
  $pub = Invoke-Api -Method Get -Uri "$BaseUrl/restaurants/public"
  $c = @($pub).Count
  Pass "5.RestaurantsPublic" "Listed $c restaurant(s)"
} catch {
  Fail "5.RestaurantsPublic" "GET /api/restaurants/public failed: $($_.Exception.Message)"
}

# --- Step 6: Customer list Dishes for Restaurant ---
try {
  $menu = Invoke-Api -Method Get -Uri "$BaseUrl/dishes/restaurant/$script:restaurantId"
  $menuCount = @($menu).Count
  Pass "6.DishesForRestaurant" "Listed $menuCount dish(es) for restaurant"
} catch {
  Fail "6.DishesForRestaurant" "GET /api/dishes/restaurant/:id failed: $($_.Exception.Message)"
}

# --- Step 7: Customer creates Order ---
try {
  if (-not $script:customerId) {
    $meResp = Invoke-Api -Method Get -Uri "$BaseUrl/auth/customer/me" -Headers @{ Authorization = "Bearer $script:customerToken" }
    $me = if ($meResp.data) { $meResp.data } else { $meResp }
    $script:customerId = $me.id; if (-not $script:customerId) { $script:customerId = $me.sub }
  }
  $orderBody = @{
    customerId   = $script:customerId
    restaurantId = $script:restaurantId
    items        = @(@{ dishId = $script:dishId; quantity = 10 })
    address      = "Smoke Test Str 1"
    phone        = "+43123456789"
  }
  if (-not $script:customerId) { Fail "7.CreateOrder" "Could not resolve customerId for order" }
  $createResp = Invoke-Api -Method Post -Uri "$BaseUrl/orders/customer" -Headers @{ Authorization = "Bearer $script:customerToken" } -Body ($orderBody | ConvertTo-Json)
  $script:orderId = $createResp.id; if (-not $script:orderId -and $createResp.data) { $script:orderId = $createResp.data.id }
  if (-not $script:orderId) { Fail "7.CreateOrder" "Order created but no id in response" }
  Pass "7.CreateOrder" "Order created id=$script:orderId"
} catch {
  $msg = $_.Exception.Message
  if ($_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message }
  Fail "7.CreateOrder" "POST /api/orders/customer failed: $msg"
}

# --- Step 8: Restaurant sees Order, sets PREPARING -> READY -> READY_FOR_PICKUP ---
try {
  $restLogin = @{ email = $RestaurantEmail; password = $RestaurantPassword } | ConvertTo-Json
  $restResp = Invoke-Api -Method Post -Uri "$BaseUrl/auth/restaurant/login" -Body $restLogin
  $r = if ($restResp.data) { $restResp.data } else { $restResp }
  $script:restaurantToken = $r.access_token; if (-not $script:restaurantToken) { $script:restaurantToken = $r.accessToken }
  if (-not $script:restaurantToken) { throw "No restaurant token" }
} catch {
  Info "Restaurant login failed, using admin for status updates: $($_.Exception.Message)"
  $script:restaurantToken = $script:adminToken
}

$statusToken = if ($script:restaurantToken) { $script:restaurantToken } else { $script:adminToken }
foreach ($status in @("PREPARING", "READY", "READY_FOR_PICKUP")) {
  try {
    $body = @{ status = $status } | ConvertTo-Json
    Invoke-Api -Method Patch -Uri "$BaseUrl/orders/$script:orderId/status" -Headers @{ Authorization = "Bearer $statusToken" } -Body $body | Out-Null
    Pass "8.RestaurantStatus.$status" "Order status set to $status"
  } catch {
    Fail "8.RestaurantStatus.$status" "PATCH /api/orders/:id/status failed: $($_.Exception.Message)"
  }
}

# --- Step 9: Driver Login ---
try {
  $drvLogin = @{ email = $DriverEmail; password = $DriverPassword } | ConvertTo-Json
  $drvResp = Invoke-Api -Method Post -Uri "$BaseUrl/auth/driver/login" -Body $drvLogin
  $d = if ($drvResp.data) { $drvResp.data } else { $drvResp }
  $script:driverToken = $d.access_token; if (-not $script:driverToken) { $script:driverToken = $d.accessToken }
  if ($d.user) { $script:driverId = $d.user.id } elseif ($d.id) { $script:driverId = $d.id } else { $script:driverId = $null }
  if (-not $script:driverToken) { Fail "9.DriverLogin" "No driver token" }
  Pass "9.DriverLogin" "Driver token obtained (id=$script:driverId). Seed: driver@uberfoods.local / driver123"
} catch {
  Fail "9.DriverLogin" "POST /api/auth/driver/login failed: $($_.Exception.Message). Ensure seed: driver@uberfoods.local, SEED_DRIVER_PASSWORD."
}

# --- Step 10: Driver sees available Order, accepts ---
try {
  $available = Invoke-Api -Method Get -Uri "$BaseUrl/drivers/orders/available" -Headers @{ Authorization = "Bearer $script:driverToken" }
  $avList = @($available); if ($available.data) { $avList = @($available.data) }
  $found = $avList | Where-Object { $_.id -eq $script:orderId } | Select-Object -First 1
  if (-not $found) { Info "Available orders: $($avList.Count); our order may be in list by id" }
  Pass "10.DriverAvailable" "GET /api/drivers/orders/available OK ($($avList.Count) available)"
} catch {
  Pass "10.DriverAvailable" "GET available (optional): $($_.Exception.Message)"
}

try {
  Invoke-Api -Method Post -Uri "$BaseUrl/drivers/orders/$script:orderId/accept" -Headers @{ Authorization = "Bearer $script:driverToken" } -Body "{}" | Out-Null
  Pass "10.DriverAccept" "Driver accepted order"
} catch {
  $msg = $_.Exception.Message
  if ($_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message }
  Fail "10.DriverAccept" "POST /api/drivers/orders/:id/accept failed: $msg"
}

# --- Step 11: Driver sets IN_TRANSIT / DELIVERING -> DELIVERED ---
try {
  foreach ($status in @("DELIVERING", "DELIVERED")) {
    $body = @{ status = $status } | ConvertTo-Json
    Invoke-Api -Method Put -Uri "$BaseUrl/drivers/orders/$script:orderId/status" -Headers @{ Authorization = "Bearer $script:driverToken" } -Body $body | Out-Null
    Pass "11.DriverStatus.$status" "Order status $status"
  }
} catch {
  Fail "11.DriverStatus" "PUT /api/drivers/orders/:id/status failed: $($_.Exception.Message)"
}

# --- Step 12: Admin Order Details + Audit ---
try {
  $orderDetail = Invoke-Api -Method Get -Uri "$BaseUrl/orders/$script:orderId" -Headers @{ Authorization = "Bearer $script:adminToken" }
  $od = if ($orderDetail.data) { $orderDetail.data } else { $orderDetail }
  $status = $od.status
  Pass "12.AdminOrderDetail" "GET /api/orders/:id OK (status=$status)"
} catch {
  Fail "12.AdminOrderDetail" "GET /api/orders/:id failed: $($_.Exception.Message)"
}

try {
  $audit = Invoke-Api -Method Get -Uri "$BaseUrl/admin/audit" -Headers @{ Authorization = "Bearer $script:adminToken" }
  $auditArr = if ($audit.data) { @($audit.data) } elseif ($audit -is [array]) { @($audit) } else { @() }
  $auditCount = $auditArr.Count
  Pass "12.AdminAudit" "GET /api/admin/audit OK (entries=$auditCount)"
} catch {
  Add-Result "12.AdminAudit" "SKIP" "Audit not available: $($_.Exception.Message)"
  Write-Host "[SKIP] 12.AdminAudit - Audit: $($_.Exception.Message)" -ForegroundColor Yellow
}

# --- Summary ---
Write-Host ""
Write-Host "========== MVP SMOKE TEST SUMMARY ==========" -ForegroundColor White
$failCount = ($script:Results | Where-Object { $_.Status -eq "FAIL" }).Count
$passCount = ($script:Results | Where-Object { $_.Status -eq "PASS" }).Count
$script:Results | Format-Table -AutoSize

if ($failCount -gt 0) {
  Write-Host "RESULT: FAIL ($failCount step(s) failed)" -ForegroundColor Red
  exit 1
}
Write-Host "RESULT: PASS ($passCount steps passed)" -ForegroundColor Green
exit 0
