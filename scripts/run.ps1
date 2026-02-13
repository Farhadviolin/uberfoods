# UberFoods Command Runner - PowerShell
# Usage: .\scripts\run.ps1 -Label "label" -Command "command"
# Example: .\scripts\run.ps1 -Label "backend-build" -Command "cd backend; npm run build"

param(
    [Parameter(Mandatory=$true)]
    [string]$Label,

    [Parameter(Mandatory=$true)]
    [string]$Command
)

# Create logs directory if it doesn't exist
$logsDir = "docs\verification\run-logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Log file path
$logFile = Join-Path $logsDir "$Label.log"

# Start logging
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$header = @"
===================================================
RUNNER: $Label
TIMESTAMP: $timestamp
COMMAND: $Command
===================================================
"@

Write-Host ""
Write-Host "🚀 Executing: $Label" -ForegroundColor Cyan
Write-Host "📝 Logging to: $logFile" -ForegroundColor Yellow
Write-Host ""

# Write header to log
$header | Out-File -FilePath $logFile -Encoding UTF8

# Log start
"[$timestamp] STARTING: $Command" | Out-File -FilePath $logFile -Append -Encoding UTF8

# Execute command
try {
    # Use cmd.exe to execute the command to avoid PowerShell parsing issues
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $Command -NoNewWindow -Wait -PassThru -RedirectStandardOutput "temp_stdout.log" -RedirectStandardError "temp_stderr.log"

    $exitCode = $process.ExitCode

    # Read output files and append to log
    if (Test-Path "temp_stdout.log") {
        $stdout = Get-Content "temp_stdout.log" -Raw
        if ($stdout) {
            $stdout | Out-File -FilePath $logFile -Append -Encoding UTF8
        }
        Remove-Item "temp_stdout.log" -Force
    }

    if (Test-Path "temp_stderr.log") {
        $stderr = Get-Content "temp_stderr.log" -Raw
        if ($stderr) {
            $stderr | Out-File -FilePath $logFile -Append -Encoding UTF8
        }
        Remove-Item "temp_stderr.log" -Force
    }

} catch {
    $exitCode = 1
    "ERROR: $($_.Exception.Message)" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

# Log finish
$endTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"" | Out-File -FilePath $logFile -Append -Encoding UTF8
"[$endTimestamp] FINISHED with exit code: $exitCode" | Out-File -FilePath $logFile -Append -Encoding UTF8
"===================================================" | Out-File -FilePath $logFile -Append -Encoding UTF8

Write-Host ""
Write-Host "✅ Execution complete" -ForegroundColor Green
Write-Host "📄 Exit code: $exitCode" -ForegroundColor White
Write-Host "📝 Full log: $logFile" -ForegroundColor White
Write-Host ""

exit $exitCode