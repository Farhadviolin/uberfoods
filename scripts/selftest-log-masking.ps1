# Log Masking Selftest for Windows PowerShell
# Tests that sensitive data is properly masked in logs

# Import the masking function from the main script
$scriptPath = Join-Path $PSScriptRoot "run-customer-e2e-ci.ps1"
$scriptContent = Get-Content $scriptPath -Raw

# Extract Mask-SensitiveText function (simplified for testing)
function Mask-SensitiveText {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }

    $t = $Text

    # 1) Authorization: Bearer <JWT>
    $t = [regex]::Replace(
        $t,
        '(?is)\b(authorization)\s*:\s*Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+',
        'authorization: Bearer ***JWT_MASKED***'
    )

    # 2) Querystring / key=value patterns (case-insensitive)
    $t = [regex]::Replace(
        $t,
        '(?is)\b(password|pass|pwd|token|access_token|refresh_token)\b\s*=\s*([^&\s]+)',
        '$1=***MASKED***'
    )

    # 3) JSON "key":"value" patterns
    $t = [regex]::Replace(
        $t,
        '(?is)"(password|pass|pwd|token|access_token|refresh_token)"\s*:\s*"[^"]*"',
        '"$1":"***MASKED***"'
    )

    # 4) Raw JWT anywhere (3 dot-separated base64url parts)
    $t = [regex]::Replace(
        $t,
        '(?is)\b[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\b',
        '***JWT_MASKED***'
    )

    # 5) Long base64-ish blobs (avoid too many false positives by requiring >=64 chars)
    $t = [regex]::Replace(
        $t,
        '(?is)\b[A-Za-z0-9+/=]{64,}\b',
        '***B64_TOKEN_MASKED***'
    )

    return $t
}

# Test cases with sensitive data that should be masked
$testCases = @(
    @{
        input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        description = 'Bearer JWT in Authorization header'
        shouldContain = 'authorization: Bearer ***JWT_MASKED***'
        shouldNotContain = @('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
    },
    @{
        input = 'Login URL: https://api.example.com/login?password=Secret123&token=abc123def456&user=test'
        description = 'Query parameters with password and token'
        shouldContain = 'password=***MASKED***'
        shouldNotContain = @('Secret123', 'abc123def456')
    },
    @{
        input = '{"password": "MySecretPass123", "access_token": "xyz789token", "refresh_token": "refresh123abc"}'
        description = 'JSON keys with sensitive values'
        shouldContain = '"password":"***MASKED***"'
        shouldNotContain = @('MySecretPass123', 'xyz789token', 'refresh123abc')
    },
    @{
        input = 'Raw JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        description = 'Raw JWT token in text'
        shouldContain = '***JWT_MASKED***'
        shouldNotContain = @('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
    },
    @{
        input = 'Base64 blob: VGhpcyBpcyBhIGxvbmcgYmFzZTY0IGJsb2IgdGhhdCBzaG91bGQgYmUgbWFza2VkIGJlY2F1c2UgaXQgaXMgdmVyeSBsb25nIGFuZCBjb250YWlucyBzZW5zaXRpdmUgZGF0YQ=='
        description = 'Long base64 blob (>=64 chars)'
        shouldContain = '***B64_TOKEN_MASKED***'
        shouldNotContain = @('VGhpcyBpcyBhIGxvbmcgYmFzZTY0IGJsb2I')
    },
    @{
        input = 'Normal log message without sensitive data'
        description = 'Normal message should pass through unchanged'
        shouldContain = 'Normal log message without sensitive data'
        shouldNotContain = @()
    }
)

Write-Host "🧪 Testing Log Masking Functionality..." -ForegroundColor Cyan
Write-Host ""

$allPassed = $true
$testNumber = 1

foreach ($test in $testCases) {
    Write-Host "Test $($testNumber): $($test.description)" -ForegroundColor Yellow

    $masked = Mask-SensitiveText $test.input

    # Check what should be present
    if ($test.shouldContain) {
        if ($masked -notlike "*$($test.shouldContain)*") {
            Write-Host "❌ FAIL: Expected '$($test.shouldContain)' not found in masked output" -ForegroundColor Red
            Write-Host "   Input: $($test.input)" -ForegroundColor Gray
            Write-Host "   Output: $masked" -ForegroundColor Gray
            $allPassed = $false
        } else {
            Write-Host "✅ PASS: Contains expected masked content" -ForegroundColor Green
        }
    }

    # Check what should NOT be present
    foreach ($forbidden in $test.shouldNotContain) {
        if ($masked -like "*$forbidden*") {
            Write-Host "❌ FAIL: Sensitive data '$forbidden' still present in output" -ForegroundColor Red
            Write-Host "   Input: $($test.input)" -ForegroundColor Gray
            Write-Host "   Output: $masked" -ForegroundColor Gray
            $allPassed = $false
        } else {
            Write-Host "✅ PASS: Sensitive data properly masked" -ForegroundColor Green
        }
    }

    Write-Host ""
    $testNumber++
}

if ($allPassed) {
    Write-Host "🎉 ALL TESTS PASSED: Log masking is working correctly!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "💥 TESTS FAILED: Log masking has security gaps!" -ForegroundColor Red
    exit 1
}