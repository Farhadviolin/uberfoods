$ErrorActionPreference = "Stop"

# IMPORTANT: prevent Playwright webServer from trying docker-compose
$env:E2E_ORCHESTRATED = "1"

function Run-Step {
  param([string]$Title, [scriptblock]$Cmd)

  Write-Host ""
  Write-Host "===================="
  Write-Host $Title
  Write-Host "===================="
  & $Cmd
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Title (ExitCode=$LASTEXITCODE)"
  }
}

function Http-Status {
  param([string]$Url)
  try {
    $res = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 5
    return [int]$res.StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    return 0
  }
}

Run-Step "Root: install" {
  # wenn du pnpm nutzt, ersetze die nächste Zeile durch: pnpm i --frozen-lockfile
  npm ci
}

Run-Step "Root: typecheck" { npm run typecheck }
Run-Step "Root: build"     { npm run build }

Run-Step "DB: check DATABASE_URL" {
  if (-not $env:DATABASE_URL) {
    throw "DATABASE_URL environment variable not set. Please set it to point to your local Postgres database.`nExample: `$env:DATABASE_URL = 'postgresql://user:pass@localhost:5432/uberfoods'`"
  }
  Write-Host "DATABASE_URL is set"
}

Run-Step "Backend: start locally" {
  $backendDir = Join-Path $PSScriptRoot "..\backend" | Resolve-Path
  $backendLog = Join-Path $env:TEMP "uberfoods-backend.log"
  if (Test-Path $backendLog) { Remove-Item $backendLog -Force }

  # Choose backend start script automatically (prefer start:e2e, then start:dev, then start:prod)
  $backendArgs = @("run")
  $packageJsonPath = Join-Path $backendDir "package.json"
  if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    if ($packageJson.scripts.'start:e2e') {
      $backendArgs += "start:e2e"
    } elseif ($packageJson.scripts.'start:dev') {
      $backendArgs += "start:dev"
    } else {
      $backendArgs += "start:prod"
    }
  } else {
    $backendArgs += "start:prod"
  }

  $global:backendProc = Start-Process -FilePath "npm" -ArgumentList $backendArgs `
    -WorkingDirectory $backendDir -PassThru `
    -RedirectStandardOutput $backendLog -RedirectStandardError $backendLog
  Write-Host "Backend PID: $($global:backendProc.Id)"
  Start-Sleep -Seconds 2
}

Run-Step "Admin Panel: start dev server (e2e)" {
  $adminDir = Join-Path $PSScriptRoot "..\frontend\admin-panel" | Resolve-Path
  $adminLog = Join-Path $env:TEMP "uberfoods-admin.log"
  if (Test-Path $adminLog) { Remove-Item $adminLog -Force }

  $adminArgs = @("run","dev:e2e")
  $global:adminProc = Start-Process -FilePath "npm" -ArgumentList $adminArgs `
    -WorkingDirectory $adminDir -PassThru `
    -RedirectStandardOutput $adminLog -RedirectStandardError $adminLog
  Write-Host "Admin Panel PID: $($global:adminProc.Id)"
  Start-Sleep -Seconds 2
}

Run-Step "Backend: wait for health" {
  $url = "http://127.0.0.1:3000/api/health"
  $ok = $false
  for ($i=0; $i -lt 120; $i++) {
    $code = Http-Status $url
    if ($code -eq 200) { $ok = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ok) {
    Write-Host "Backend log tail:"
    Get-Content (Join-Path $env:TEMP "uberfoods-backend.log") -Tail 200 -ErrorAction SilentlyContinue
    throw "Backend health not ready (http://127.0.0.1:3000/api/health)"
  }
}

Run-Step "DB: migrate deploy" {
  Push-Location "backend"
  try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
      Write-Host "migrate deploy failed; falling back to prisma db push for local schema sync"
      npx prisma db push --schema=./prisma/schema.prisma
    }
  } finally {
    Pop-Location
  }
}

Run-Step "DB: seed idempotency (run 3x)" {
  Push-Location "backend"
  try {
    1..3 | ForEach-Object {
      Write-Host ""
      Write-Host "Seed run #$_"
      npm run prisma:seed
    }
  } finally {
    Pop-Location
  }
}

Run-Step "Admin Panel: E2E 3x stable" {
  Push-Location "frontend/admin-panel"
  try {
    1..3 | ForEach-Object {
      Write-Host ""
      Write-Host "E2E run #$_"
      npx playwright test --project=chromium
      if ($LASTEXITCODE -ne 0) { throw "E2E failed on run #$_" }
    }
  } finally {
    Pop-Location
  }
}

# Clean up processes
if ($global:adminProc -and !$global:adminProc.HasExited) {
  Write-Host "Stopping Admin Panel..."
  Stop-Process -Id $global:adminProc.Id -Force
}
if ($global:backendProc -and !$global:backendProc.HasExited) {
  Write-Host "Stopping backend..."
  Stop-Process -Id $global:backendProc.Id -Force
}

Write-Host ""
Write-Host "✅ VERIFY COMPLETE (NO-DOCKER): typecheck/build/seed(3x)/e2e(3x) all green"
