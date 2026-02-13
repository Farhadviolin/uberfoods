#!/bin/bash

# PR-7 SAST (Static Application Security Testing) Runner
# Uses Semgrep for comprehensive security scanning

set -e

# Configuration
SEMGREP_CONFIG="p/ci"  # Semgrep CI ruleset (OWASP + security best practices)
BASELINE_FILE=".semgrepignore"
OUTPUT_DIR="docs/verification"
OUTPUT_FILE="${OUTPUT_DIR}/pr7-sast-results.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
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

# Check if semgrep is available
check_semgrep() {
    if ! command -v semgrep &> /dev/null; then
        error "Semgrep not found. Please install semgrep:"
        echo "  pip install semgrep"
        echo "  # or"
        echo "  docker run --rm -v \$(pwd):/src semgrep/semgrep semgrep --help"
        exit 1
    fi

    log "Semgrep found: $(semgrep --version)"
}

# Create output directory
setup_output() {
    mkdir -p "$OUTPUT_DIR"
    log "Output directory ready: $OUTPUT_DIR"
}

# Run SAST scan
run_sast_scan() {
    log "Starting SAST scan with Semgrep..."

    # Run semgrep with CI ruleset
    semgrep scan \
        --config "$SEMGREP_CONFIG" \
        --exclude "$BASELINE_FILE" \
        --json \
        --output "$OUTPUT_FILE" \
        backend/src \
        frontend/admin-panel/src

    local exit_code=$?
    log "SAST scan completed with exit code: $exit_code"
    return $exit_code
}

# Analyze results
analyze_results() {
    if [ ! -f "$OUTPUT_FILE" ]; then
        error "Results file not found: $OUTPUT_FILE"
        return 1
    fi

    # Count findings by severity
    local critical=$(jq '.results | map(select(.extra.severity == "ERROR")) | length' "$OUTPUT_FILE")
    local warning=$(jq '.results | map(select(.extra.severity == "WARNING")) | length' "$OUTPUT_FILE")
    local info=$(jq '.results | map(select(.extra.severity == "INFO")) | length' "$OUTPUT_FILE")

    log "SAST Results Summary:"
    echo "  Critical: $critical"
    echo "  Warning: $warning"
    echo "  Info: $info"

    # Generate human-readable summary
    local summary_file="${OUTPUT_DIR}/pr7-sast-summary.txt"
    {
        echo "SAST SCAN SUMMARY"
        echo "================="
        echo "Timestamp: $(date)"
        echo "Tool: Semgrep $(semgrep --version)"
        echo "Ruleset: $SEMGREP_CONFIG"
        echo ""
        echo "Findings by Severity:"
        echo "  Critical/High: $critical"
        echo "  Warning/Medium: $warning"
        echo "  Info/Low: $info"
        echo ""
        echo "Top Issues:"
        jq -r '.results[] | select(.extra.severity == "ERROR") | "- \(.path):\(.start.line): \(.extra.message)"' "$OUTPUT_FILE" | head -10
        echo ""
        echo "Recommendations:"
        if [ "$critical" -gt 0 ]; then
            echo "- Address critical findings before deployment"
        fi
        if [ "$warning" -gt 0 ]; then
            echo "- Review warning findings for potential security issues"
        fi
        echo "- Consider adding false positives to .semgrepignore with justification"
    } > "$summary_file"

    log "Summary written to: $summary_file"

    # Determine pass/fail
    if [ "$critical" -gt 0 ]; then
        error "❌ SAST scan failed: $critical critical findings"
        return 1
    elif [ "$warning" -gt 10 ]; then
        warn "⚠️  SAST scan has many warnings: $warning findings"
        return 0  # Warnings don't fail the build
    else
        log "✅ SAST scan passed: $critical critical, $warning warnings"
        return 0
    fi
}

# Check baseline file
check_baseline() {
    if [ -f ".semgrepignore" ]; then
        log "Baseline file found: .semgrepignore"
        local baseline_count=$(wc -l < .semgrepignore)
        log "Baseline entries: $baseline_count"
    else
        warn "No baseline file found. Consider creating .semgrepignore for known issues"
    fi
}

# Main execution
main() {
    log "🚀 Starting PR-7 SAST Security Scan"

    check_semgrep
    setup_output
    check_baseline

    if run_sast_scan; then
        analyze_results
        local result=$?
        if [ $result -eq 0 ]; then
            log "✅ SAST scan completed successfully"
        else
            error "❌ SAST scan found critical issues"
        fi
        exit $result
    else
        error "❌ SAST scan failed to execute"
        exit 1
    fi
}

# Run main function
main "$@"