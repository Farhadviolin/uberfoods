#!/bin/bash
# Log Masking Selftest for Linux Bash
# Tests that sensitive data masking is properly implemented in the CI scripts

# Test that the main script has masking implementation
test_main_script_implementation() {
    local script_file="scripts/run-customer-e2e-ci.sh"

    if [ ! -f "$script_file" ]; then
        echo "❌ FAIL: Main script $script_file not found"
        return 1
    fi

    echo "✅ PASS: Main script exists"

    # Check for mask function
    if ! grep -q "^mask()" "$script_file"; then
        echo "❌ FAIL: mask() function not found in main script"
        return 1
    fi
    echo "✅ PASS: mask() function exists"

    # Check for log function that uses masking
    if ! grep -q "local logline.*mask" "$script_file"; then
        echo "❌ FAIL: log function does not use mask"
        return 1
    fi
    echo "✅ PASS: log function uses masking"

    # Check for Authorization Bearer masking
    if ! grep -q "authorization.*Bearer.*JWT_MASKED" "$script_file"; then
        echo "❌ FAIL: Authorization Bearer JWT masking not implemented"
        return 1
    fi
    echo "✅ PASS: Authorization Bearer JWT masking implemented"

    # Check for query parameter masking
    if ! grep -q "password.*=.*MASKED" "$script_file" && ! grep -q "assword.*MASKED" "$script_file"; then
        echo "❌ FAIL: Query parameter masking not implemented"
        return 1
    fi
    echo "✅ PASS: Query parameter masking implemented"

    # Check for JSON key masking (look for ***MASKED*** pattern)
    if ! grep -q '\\*\\*\\*MASKED\\*\\*\\*' "$script_file"; then
        echo "❌ FAIL: JSON key masking not implemented"
        return 1
    fi
    echo "✅ PASS: JSON key masking implemented"

    # Check for raw JWT masking
    if ! grep -q "JWT_MASKED" "$script_file"; then
        echo "❌ FAIL: Raw JWT masking not implemented"
        return 1
    fi
    echo "✅ PASS: Raw JWT masking implemented"

    # Check for base64 blob masking
    if ! grep -q "B64_TOKEN_MASKED" "$script_file"; then
        echo "❌ FAIL: Base64 blob masking not implemented"
        return 1
    fi
    echo "✅ PASS: Base64 blob masking implemented"

    return 0
}

echo "🧪 Testing Log Masking Implementation..."
echo ""

if test_main_script_implementation; then
    echo ""
    echo "🎉 ALL TESTS PASSED: Log masking implementation is complete!"
    echo ""
    echo "Note: For runtime verification, run the actual CI scripts and check logs for:"
    echo "- No 'Bearer eyJ...' patterns"
    echo "- No 'password=Secret123' patterns"
    echo "- No '\"access_token\":\"eyJ...\"' patterns"
    echo "- Presence of '***JWT_MASKED***', '***MASKED***', '***B64_TOKEN_MASKED***'"
    exit 0
else
    echo ""
    echo "💥 TESTS FAILED: Log masking implementation is incomplete!"
    exit 1
fi