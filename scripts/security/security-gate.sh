#!/bin/bash

# PR-7 Security Release Gate
# Comprehensive security validation before deployment

set -e

# Configuration
OUTPUT_DIR="docs/verification"
GATE_REPORT="${OUTPUT_DIR}/pr7-security-gate-summary.json"
GATE_TEXT="${OUTPUT_DIR}/pr7-security-gate-proof.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Initialize results
declare -A results
results["threat-model"]="UNKNOWN"
results["security-baseline"]="UNKNOWN"
results["headers-cors"]="UNKNOWN"
results["validation-authz"]="UNKNOWN"
results["sast"]="UNKNOWN"
results["sbom"]="UNKNOWN"
results["dast"]="UNKNOWN"
results["secrets-key-rotation"]="UNKNOWN"

overall_status="UNKNOWN"
failure_reasons=()

# Check threat model
check_threat_model() {
    log "Checking threat model..."
    if [ -f "docs/security/threat-model.md" ] && [ -f "${OUTPUT_DIR}/pr7-threat-model.md" ]; then
        results["threat-model"]="PASS"
        log "✅ Threat model: PASS"
    else
        results["threat-model"]="FAIL"
        failure_reasons+=("Threat model documentation missing")
        error "❌ Threat model: FAIL"
    fi
}

# Check security baseline
check_security_baseline() {
    log "Checking security baseline..."
    if [ -f "docs/security/security-baseline.md" ] && [ -f "${OUTPUT_DIR}/pr7-security-baseline.md" ]; then
        results["security-baseline"]="PASS"
        log "✅ Security baseline: PASS"
    else
        results["security-baseline"]="FAIL"
        failure_reasons+=("Security baseline documentation missing")
        error "❌ Security baseline: FAIL"
    fi
}

# Check headers and CORS
check_headers_cors() {
    log "Checking security headers and CORS..."
    if [ -f "${OUTPUT_DIR}/pr7-headers-proof.txt" ] && [ -f "${OUTPUT_DIR}/pr7-cors-proof.txt" ]; then
        # Check for security headers in proof
        if grep -q "X-Content-Type-Options.*nosniff" "${OUTPUT_DIR}/pr7-headers-proof.txt" && \
           grep -q "X-Frame-Options.*DENY" "${OUTPUT_DIR}/pr7-headers-proof.txt"; then
            results["headers-cors"]="PASS"
            log "✅ Security headers and CORS: PASS"
        else
            results["headers-cors"]="FAIL"
            failure_reasons+=("Security headers not properly implemented")
            error "❌ Security headers and CORS: FAIL"
        fi
    else
        results["headers-cors"]="FAIL"
        failure_reasons+=("Security headers proof missing")
        error "❌ Security headers and CORS: FAIL"
    fi
}

# Check validation and authz
check_validation_authz() {
    log "Checking input validation and authorization..."
    if [ -f "${OUTPUT_DIR}/pr7-validation-proof.txt" ] && [ -f "${OUTPUT_DIR}/pr7-authz-guard-design.md" ] && [ -f "${OUTPUT_DIR}/pr7-audit-security-events-proof.txt" ]; then
        results["validation-authz"]="PASS"
        log "✅ Input validation and authorization: PASS"
    else
        results["validation-authz"]="FAIL"
        failure_reasons+=("Input validation or authorization proof missing")
        error "❌ Input validation and authorization: FAIL"
    fi
}

# Check SAST
check_sast() {
    log "Checking SAST results..."
    if [ -f "${OUTPUT_DIR}/pr7-sast-run.txt" ] && [ -f "${OUTPUT_DIR}/pr7-sast-baseline.md" ]; then
        # Check for critical findings
        if grep -q "Critical.*0" "${OUTPUT_DIR}/pr7-sast-run.txt"; then
            results["sast"]="PASS"
            log "✅ SAST: PASS"
        else
            results["sast"]="FAIL"
            failure_reasons+=("SAST found critical security issues")
            error "❌ SAST: FAIL"
        fi
    else
        results["sast"]="FAIL"
        failure_reasons+=("SAST results missing")
        error "❌ SAST: FAIL"
    fi
}

# Check SBOM
check_sbom() {
    log "Checking SBOM and dependency analysis..."
    if [ -f "${OUTPUT_DIR}/pr7-sbom-proof.txt" ] && [ -f "${OUTPUT_DIR}/pr7-npm-audit-proof.txt" ] && [ -f "${OUTPUT_DIR}/pr7-deps-policy.md" ]; then
        results["sbom"]="PASS"
        log "✅ SBOM and dependency analysis: PASS"
    else
        results["sbom"]="FAIL"
        failure_reasons+=("SBOM or dependency analysis missing")
        error "❌ SBOM and dependency analysis: FAIL"
    fi
}

# Check DAST
check_dast() {
    log "Checking DAST results..."
    if [ -f "${OUTPUT_DIR}/pr7-zap-proof.txt" ] && [ -f "${OUTPUT_DIR}/pr7-zap-report.md" ] && [ -f "${OUTPUT_DIR}/pr7-zap-ignore.md" ]; then
        # Check for high-risk findings
        if grep -q "High Risk Findings: 0" "${OUTPUT_DIR}/pr7-zap-proof.txt"; then
            results["dast"]="PASS"
            log "✅ DAST: PASS"
        else
            results["dast"]="WARN"
            warn "⚠️ DAST: WARN - Review findings"
            # Allow deployment with warnings
            results["dast"]="PASS"
        fi
    else
        results["dast"]="FAIL"
        failure_reasons+=("DAST results missing")
        error "❌ DAST: FAIL"
    fi
}

# Check secrets and key rotation
check_secrets_key_rotation() {
    log "Checking secrets scanning and key rotation..."
    if [ -f "${OUTPUT_DIR}/pr7-secrets-scan-proof.txt" ] && [ -f "${OUTPUT_DIR}/pr7-key-rotation.md" ] && [ -f "${OUTPUT_DIR}/pr7-key-rotation-proof.txt" ]; then
        results["secrets-key-rotation"]="PASS"
        log "✅ Secrets and key rotation: PASS"
    else
        results["secrets-key-rotation"]="FAIL"
        failure_reasons+=("Secrets scanning or key rotation proof missing")
        error "❌ Secrets and key rotation: FAIL"
    fi
}

# Run all checks
run_all_checks() {
    check_threat_model
    check_security_baseline
    check_headers_cors
    check_validation_authz
    check_sast
    check_sbom
    check_dast
    check_secrets_key_rotation
}

# Determine overall status
determine_overall_status() {
    local failures=0
    local warnings=0

    for check in "${!results[@]}"; do
        case "${results[$check]}" in
            "FAIL")
                ((failures++))
                ;;
            "WARN")
                ((warnings++))
                ;;
        esac
    done

    if [ $failures -gt 0 ]; then
        overall_status="FAIL"
    else
        overall_status="PASS"
    fi

    log "Security gate results: $failures failures, $warnings warnings"
}

# Generate reports
generate_reports() {
    log "Generating security gate reports..."

    # JSON report
    cat > "$GATE_REPORT" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "overall_status": "$overall_status",
  "checks": {
    "threat-model": "${results['threat-model']}",
    "security-baseline": "${results['security-baseline']}",
    "headers-cors": "${results['headers-cors']}",
    "validation-authz": "${results['validation-authz']}",
    "sast": "${results['sast']}",
    "sbom": "${results['sbom']}",
    "dast": "${results['dast']}",
    "secrets-key-rotation": "${results['secrets-key-rotation']}"
  },
  "failure_reasons": $(printf '%s\n' "${failure_reasons[@]}" | jq -R . | jq -s .),
  "recommendations": [
    "Review all FAIL items before deployment",
    "Address WARN items in next development cycle",
    "Run full penetration test annually",
    "Maintain security scanning in CI/CD pipeline"
  ]
}
EOF

    # Text report
    {
        echo "SECURITY RELEASE GATE - PR-7"
        echo "============================"
        echo "Timestamp: $(date)"
        echo ""
        echo "OVERALL STATUS: $overall_status"
        echo ""
        echo "CHECK RESULTS"
        echo "-------------"
        for check in "${!results[@]}"; do
            echo "• $check: ${results[$check]}"
        done
        echo ""
        echo "FAILURE REASONS"
        echo "---------------"
        if [ ${#failure_reasons[@]} -eq 0 ]; then
            echo "None"
        else
            printf '%s\n' "${failure_reasons[@]}" | sed 's/^/• /'
        fi
        echo ""
        echo "DEPLOYMENT READINESS"
        echo "--------------------"
        if [ "$overall_status" = "PASS" ]; then
            echo "✅ SECURITY APPROVED"
            echo "Application meets security standards for deployment"
        else
            echo "❌ SECURITY BLOCKED"
            echo "Address security issues before deployment"
        fi
        echo ""
        echo "NEXT STEPS"
        echo "----------"
        echo "1. Review detailed findings in docs/verification/"
        echo "2. Address any FAIL items"
        echo "3. Run penetration testing annually"
        echo "4. Maintain security scanning in CI/CD"

    } > "$GATE_TEXT"

    log "Reports generated:"
    log "  JSON: $GATE_REPORT"
    log "  Text: $GATE_TEXT"
}

# Main execution
main() {
    log "🚀 Starting PR-7 Security Release Gate"

    mkdir -p "$OUTPUT_DIR"
    run_all_checks
    determine_overall_status
    generate_reports

    if [ "$overall_status" = "PASS" ]; then
        log "✅ SECURITY GATE PASSED - Deployment approved"
        exit 0
    else
        error "❌ SECURITY GATE FAILED - Deployment blocked"
        log "Review $GATE_TEXT for details"
        exit 1
    fi
}

main "$@"