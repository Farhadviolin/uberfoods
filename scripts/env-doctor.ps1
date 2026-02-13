# UberFoods Environment Doctor - PowerShell
# Checks system and tool availability for development

Write-Host "UBERFOODS ENVIRONMENT DOCTOR - PowerShell"
Write-Host "=========================================="
Write-Host ""

# System Information
Write-Host "SYSTEM INFORMATION"
Write-Host "------------------"

try {
    Write-Host "PowerShell Version:" $PSVersionTable.PSVersion
} catch {
    Write-Host "PowerShell Version: FAILED -" $_.Exception.Message
}

try {
    $executionPolicy = Get-ExecutionPolicy -List
    Write-Host "Execution Policy:"
    $executionPolicy | ForEach-Object { Write-Host "  $($_.Scope): $($_.ExecutionPolicy)" }
} catch {
    Write-Host "Execution Policy: FAILED -" $_.Exception.Message
}

try {
    $user = whoami
    Write-Host "Current User:" $user
} catch {
    Write-Host "Current User: FAILED -" $_.Exception.Message
}

try {
    $osVersion = (Get-CimInstance Win32_OperatingSystem).Version
    Write-Host "Windows Version:" $osVersion
} catch {
    Write-Host "Windows Version: FAILED -" $_.Exception.Message
}

Write-Host ""

# Tool Checks
Write-Host "DEVELOPMENT TOOLS"
Write-Host "-----------------"

$tools = @(
    @{Name="Git"; Command="git --version"; PathCheck="where.exe git"},
    @{Name="Node.js"; Command="node -v"; PathCheck="where.exe node"},
    @{Name="NPM"; Command="npm -v"; PathCheck="where.exe npm"},
    @{Name="PNPM"; Command="pnpm -v"; PathCheck="where.exe pnpm"},
    @{Name="Yarn"; Command="yarn -v"; PathCheck="where.exe yarn"},
    @{Name="Docker"; Command="docker version"; PathCheck="where.exe docker"},
    @{Name="Docker Compose"; Command="docker compose version"; PathCheck="where.exe docker"},
    @{Name="Curl"; Command="curl --version"; PathCheck="where.exe curl"}
)

foreach ($tool in $tools) {
    Write-Host "$($tool.Name): " -NoNewline

    try {
        $pathResult = & cmd.exe /c "$($tool.PathCheck) 2>nul"
        if ($LASTEXITCODE -eq 0) {
            try {
                $version = & cmd.exe /c "$($tool.Command) 2>nul"
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "OK -" $version
                } else {
                    Write-Host "PATH OK but command failed"
                }
            } catch {
                Write-Host "PATH OK but execution failed"
            }
        } else {
            Write-Host "NOT FOUND in PATH"
        }
    } catch {
        Write-Host "CHECK FAILED -" $_.Exception.Message
    }
}

Write-Host ""

# Environment Information
Write-Host "ENVIRONMENT"
Write-Host "-----------"

try {
    $currentDir = Get-Location
    Write-Host "Current Directory:" $currentDir
} catch {
    Write-Host "Current Directory: FAILED -" $_.Exception.Message
}

try {
    $pathVar = $env:PATH
    $pathArray = $pathVar -split ";"
    Write-Host "System PATH entries count:" $pathArray.Count
    Write-Host "First 5 system PATH entries:"
    for ($i = 0; $i -lt [Math]::Min(5, $pathArray.Count); $i++) {
        Write-Host "  $($pathArray[$i])"
    }
    if ($pathArray.Count -gt 5) {
        Write-Host "  ... and $($pathArray.Count - 5) more"
    }
} catch {
    Write-Host "PATH Analysis: FAILED -" $_.Exception.Message
}

Write-Host ""

# Summary
Write-Host "SUMMARY"
Write-Host "-------"
Write-Host "Environment doctor completed. Check results above."
Write-Host "If any tools show 'NOT FOUND' or 'FAILED', they need to be installed or PATH needs fixing."

Write-Host ""
Write-Host "ENV-DOCTOR COMPLETE"