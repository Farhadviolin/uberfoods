<#
.SYNOPSIS
  Diagnose: Prüft ob Backend im Container auf 0.0.0.0:3000 hört und /api/health erreichbar ist.
#>

$ErrorActionPreference = "Continue"
$container = "uberfoods_backend"

Write-Host "=== 1) docker ps (PORTS) ===" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1

Write-Host "`n=== 2) docker logs $container --tail 120 ===" -ForegroundColor Cyan
docker logs $container --tail 120 2>&1

Write-Host "`n=== 3) Listener on :3000 inside container ===" -ForegroundColor Cyan
docker exec $container sh -c "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || true" 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "(ss/netstat nicht verfügbar, versuche node check)" -ForegroundColor Yellow
  docker exec $container node -e "
    const http = require('http');
    const req = http.get('http://127.0.0.1:3000/api/health', (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => console.log('Container-intern /api/health:', r.statusCode, d.substring(0,200)));
    });
    req.on('error', e => console.error('Container-intern ERROR:', e.message));
  " 2>&1
}

Write-Host "`n=== 4) Container-intern: GET http://127.0.0.1:3000/api/health ===" -ForegroundColor Cyan
docker exec $container node -e "
  const http = require('http');
  const req = http.get('http://127.0.0.1:3000/api/health', (r) => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => console.log('Status:', r.statusCode, 'Body:', d.substring(0,300)));
  });
  req.on('error', e => console.error('Error:', e.message));
" 2>&1

Write-Host "`n=== 5) Host: Invoke-WebRequest http://localhost:3000/api/health ===" -ForegroundColor Cyan
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "Status: $($r.StatusCode)" -ForegroundColor Green
  Write-Host $r.Content
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== VERDICT ===" -ForegroundColor Cyan
$containerRunning = docker ps -q -f "name=$container" 2>&1
if (-not $containerRunning) {
  Write-Host "LISTENER MISSING (Container $container nicht gestartet oder beendet)" -ForegroundColor Red
  exit 1
}
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 3
  if ($r.StatusCode -eq 200) {
    Write-Host "LISTENER OK (Backend hört auf 0.0.0.0:3000, /api/health erreichbar)" -ForegroundColor Green
    exit 0
  }
  Write-Host "ROUTE WRONG (/api/health antwortet mit $($r.StatusCode))" -ForegroundColor Yellow
  exit 1
} catch {
  Write-Host "LISTENER MISSING (localhost:3000 nicht erreichbar: $($_.Exception.Message))" -ForegroundColor Red
  exit 1
}
