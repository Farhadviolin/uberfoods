$ErrorActionPreference = "Continue"
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

Write-Host "=== verify-local: Ports + Prozesse + HTTP Checks ==="

$ports = @(3000,3002,3003,3004,5173)

Write-Host "`n[1] LISTENERS"
$listen = Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in $ports } |
  Select-Object LocalAddress,LocalPort,OwningProcess | Sort-Object LocalPort
$listen | Format-Table -AutoSize

Write-Host "`n[2] PROCESSES"
$ids = @()
if ($listen) { $ids = $listen.OwningProcess | Sort-Object -Unique }
if ($ids.Count -gt 0) {
  Get-Process -Id $ids -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path | Format-Table -AutoSize
} else {
  Write-Host "No listener processes found for expected ports."
}

function Check-Http {
  param([string]$Name,[string]$Url)
  try {
    $r = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 6
    Write-Host ("[OK] {0} -> {1} ({2})" -f $Name, $r.StatusCode, $Url)
  } catch {
    Write-Host ("[FAIL] {0} -> {1} | {2}" -f $Name, $Url, $_.Exception.Message)
  }
}

Write-Host "`n[3] HTTP CHECKS"
Check-Http -Name "Backend Health" -Url "http://localhost:3000/api/health"
Check-Http -Name "Customer Web"   -Url "http://localhost:5173/"
Check-Http -Name "Admin (localhost)" -Url "http://localhost:3002/"
Check-Http -Name "Admin (127.0.0.1)" -Url "http://127.0.0.1:3002/"
Check-Http -Name "Restaurant Web" -Url "http://localhost:3003/"
Check-Http -Name "Driver App"     -Url "http://localhost:3004/"

Write-Host "`nDONE."
Write-Host "If Admin localhost fails but 127.0.0.1 works: IPv6 binding. dev:fixed uses --host :: to fix it."
