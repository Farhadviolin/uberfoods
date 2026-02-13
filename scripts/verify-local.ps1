$ErrorActionPreference = "Stop"

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

# Prefer docker compose if available
$useDockerComposeV2 = $false
try { docker compose version *> $null; $useDockerComposeV2 = $true } catch {}

function DC {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  if ($useDockerComposeV2) {
    docker compose @Args
  } else {
    docker-compose @Args
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Run-Step "Root: install" {
  # wenn du pnpm nutzt, ersetze die nächste Zeile durch: pnpm i --frozen-lockfile
  npm ci
}

Run-Step "Backend: build" {
  Push-Location "backend"
  try {
    npm run build
  } finally {
    Pop-Location
  }
}

Run-Step "Admin Panel: typecheck" {
  Push-Location "frontend/admin-panel"
  try {
    npm run typecheck
  } finally {
    Pop-Location
  }
}

Run-Step "Docker: check availability" {
  # Check if Docker is installed
  try {
    $dockerVersion = docker --version
    Write-Host "Docker found: $dockerVersion"
  } catch {
    throw "Docker Desktop/daemon not running. Start Docker then re-run."
  }

  # Check if Docker daemon is running
  try {
    docker info *> $null
    Write-Host "Docker daemon is running"
  } catch {
    throw "Docker Desktop/daemon not running. Start Docker then re-run."
  }
}

Run-Step "Docker: up -d" { DC up -d }

Run-Step "Backend: wait for health" {
  $url = "http://127.0.0.1:3000/api/health"
  $ok = $false
  for ($i=0; $i -lt 60; $i++) {
    $code = Http-Status $url
    if ($code -eq 200) { $ok = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ok) {
    DC logs backend --tail 200
    throw "Backend health not ready (http://127.0.0.1:3000/api/health)"
  }
}

Run-Step "DB: migrate deploy" { DC exec -T backend npx prisma migrate deploy }

Run-Step "DB: seed idempotency (run 3x)" {
  1..3 | ForEach-Object {
    Write-Host ""
    Write-Host "Seed run #$_"
    DC exec -T backend npm run prisma:seed
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

Write-Host ""
Write-Host "✅ VERIFY COMPLETE: typecheck/build/seed(3x)/e2e(3x) all green"
