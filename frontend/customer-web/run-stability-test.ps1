# PowerShell Script to run E2E stability tests (10 consecutive runs)
param(
    [int]$Runs = 10,
    [string]$TestPattern = "api-validation.spec.ts"
)

Write-Host "🧪 Running E2E Stability Test: $Runs consecutive runs" -ForegroundColor Green
Write-Host "📋 Test Pattern: $TestPattern" -ForegroundColor Cyan

$successCount = 0
$totalTime = 0

for ($i = 1; $i -le $Runs; $i++) {
    Write-Host "`n🔄 Run $i/$Runs - Starting..." -ForegroundColor Yellow

    $startTime = Get-Date

    try {
        # Run the specific test
        $result = & npx playwright test $TestPattern --reporter=line 2>&1

        # Check exit code
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Run $i/$Runs - PASSED" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ Run $i/$Runs - FAILED" -ForegroundColor Red
            Write-Host "Output:" -ForegroundColor Red
            $result | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        }
    } catch {
        Write-Host "❌ Run $i/$Runs - ERROR: $_" -ForegroundColor Red
    }

    $endTime = Get-Date
    $runTime = ($endTime - $startTime).TotalSeconds
    $totalTime += $runTime

    Write-Host "⏱️  Run $i took $([math]::Round($runTime, 2)) seconds" -ForegroundColor Gray
}

# Summary
$avgTime = [math]::Round($totalTime / $Runs, 2)
$successRate = [math]::Round(($successCount / $Runs) * 100, 2)

Write-Host "`n📊 STABILITY TEST RESULTS:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Successful runs: $successCount/$Runs" -ForegroundColor $(if ($successCount -eq $Runs) { "Green" } else { "Red" })
Write-Host "📈 Success rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 75) { "Yellow" } else { "Red" })
Write-Host "⏱️  Average time per run: $avgTime seconds" -ForegroundColor Gray
Write-Host "⏱️  Total time: $([math]::Round($totalTime, 2)) seconds" -ForegroundColor Gray

if ($successCount -eq $Runs) {
    Write-Host "`n🎉 PERFECT STABILITY ACHIEVED! All $Runs runs passed." -ForegroundColor Green
    exit 0
} elseif ($successCount -ge ($Runs * 0.9)) {
    Write-Host "`n👍 HIGH STABILITY: $successRate% success rate" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`n💥 STABILITY ISSUES: Only $successRate% success rate" -ForegroundColor Red
    exit 1
}