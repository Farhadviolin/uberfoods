param(
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"

# Ensure UTF-8 output
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

Write-Host "=== UberFoods dev-up: Docker + Frontends + Smoke ==="

# Correct repoRoot: scripts/.. (NOT scripts itself)
$scriptsDir = Split-Path -Parent $PSCommandPath
$repoRoot = (Resolve-Path (Join-Path $scriptsDir "..")).Path
Set-Location $repoRoot

function Assert-Dir {
  param([string]$Path, [string]$Name)
  if (-not (Test-Path -LiteralPath $Path)) {
    # IMPORTANT: avoid "$Name:" which breaks PowerShell parsing
    throw ("[P0] Expected folder missing for {0}: {1}`n(RepoRoot resolved to: {2})" -f $Name, $Path, $repoRoot)
  }
}

function Start-AppWindow {
    param(
        [string]$Name,
        [string]$Path,
        [string]$NpmScript,
        [string]$ExtraArgs = ""
    )

    Assert-Dir -Path $Path -Name $Name

    $cmd = if ([string]::IsNullOrWhiteSpace($ExtraArgs)) {
      "npm run $NpmScript"
    } else {
      "npm run $NpmScript -- $ExtraArgs"
    }

    Write-Host ("[START] {0} ({1}) -> {2}" -f $Name, $Path, $cmd)

    Start-Process powershell -WindowStyle Minimized -WorkingDirectory $Path -ArgumentList @(
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-Command", $cmd
    ) | Out-Null
}

function Wait-For-Port {
  param([int]$Port,[int]$TimeoutSeconds = 45)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      if (Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet) { return $true }
    } catch {}
    Start-Sleep -Milliseconds 400
  }
  return $false
}

function Wait-For-Http200 {
  param([string]$Url,[int]$TimeoutSeconds = 45)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -eq 200) { return $true }
    } catch {}
    Start-Sleep -Milliseconds 600
  }
  return $false
}

Write-Host "`n[1/4] Docker Compose up -d..."
docker compose up -d

Write-Host "`n[2/4] Frontends starten..."

$adminPath      = Join-Path $repoRoot "frontend\admin-panel"
$customerPath   = Join-Path $repoRoot "frontend\customer-web"
$restaurantPath = Join-Path $repoRoot "frontend\restaurant-web"
$driverPath     = Join-Path $repoRoot "frontend\driver-app"

# Admin must be reachable via localhost (IPv6) + 127.0.0.1 (IPv4)
Start-AppWindow -Name "Admin Panel"     -Path $adminPath      -NpmScript "dev:fixed"
Start-AppWindow -Name "Customer Web"    -Path $customerPath   -NpmScript "dev" -ExtraArgs "--host :: --port 5173 --strictPort"
Start-AppWindow -Name "Restaurant Web"  -Path $restaurantPath -NpmScript "dev" -ExtraArgs "--host :: --port 3003 --strictPort"
Start-AppWindow -Name "Driver App"      -Path $driverPath     -NpmScript "dev" -ExtraArgs "--host :: --port 3004 --strictPort"

Write-Host "`n[3/4] Warten, bis Dev-Server lauschen..."

foreach ($p in @(3002,5173,3003,3004)) {
  if (Wait-For-Port -Port $p -TimeoutSeconds 45) {
    Write-Host ("[OK] Port {0} lauscht." -f $p)
  } else {
    Write-Host ("[WARN] Port {0} lauscht nach Timeout nicht." -f $p)
  }
}

if (Wait-For-Http200 -Url "http://localhost:3000/api/health" -TimeoutSeconds 45) {
  Write-Host "[OK] Backend Health 200."
} else {
  Write-Host "[WARN] Backend Health nicht 200 innerhalb Timeout."
}

Write-Host "`nVerfügbare URLs:"
Write-Host "  Backend Health:      http://localhost:3000/api/health"
Write-Host "  Admin Panel (IPv6):  http://localhost:3002/"
Write-Host "  Admin Panel (IPv4):  http://127.0.0.1:3002/"
Write-Host "  Customer Web:        http://localhost:5173/"
Write-Host "  Restaurant Web:      http://localhost:3003/"
Write-Host "  Driver App:          http://localhost:3004/"

if ($SkipSmoke) {
  Write-Host "`n[4/4] Smoke-Test übersprungen (SkipSmoke gesetzt)."
  exit 0
}

Write-Host "`n[4/4] Starte Smoke-Test (npm run smoke:mvp)..."
npm run smoke:mvp

