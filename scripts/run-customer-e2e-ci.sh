#!/bin/bash
# Customer E2E CI Runner for Linux
# Deterministic E2E test execution for CI/CD pipelines

set -e  # Exit on any error

# Configuration
DOCKER_WAIT_SECONDS=${DOCKER_WAIT_SECONDS:-300}
BACKEND_WAIT_SECONDS=${BACKEND_WAIT_SECONDS:-30}
FRONTEND_WAIT_SECONDS=${FRONTEND_WAIT_SECONDS:-20}
ARTIFACTS_PATH=${ARTIFACTS_PATH:-"artifacts/e2e-customer"}
SKIP_CLEANUP=${SKIP_CLEANUP:-false}

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RUN_ID="ci-$TIMESTAMP"
LOG_FILE="${ARTIFACTS_PATH}/customer-e2e-ci-${TIMESTAMP}.log"

# Ensure artifacts directory exists
mkdir -p "$ARTIFACTS_PATH"

# Function to mask sensitive data comprehensively
mask() {
    # Reads stdin, writes masked stdout
    if command -v python3 >/dev/null 2>&1; then
        python3 - <<'PY'
import re,sys
s=sys.stdin.read()
rules=[
    (re.compile(r'(?is)\bauthorization\s*:\s*Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+'),
     'authorization: Bearer ***JWT_MASKED***'),
    (re.compile(r'(?is)\b(password|pass|pwd|token|access_token|refresh_token)\b\s*=\s*([^&\s]+)'),
     lambda m: f"{m.group(1)}=***MASKED***"),
    (re.compile(r'(?is)"(password|pass|pwd|token|access_token|refresh_token)"\s*:\s*"[^"]*"'),
     lambda m: f"\"{m.group(1)}\":\"***MASKED***\""),
    (re.compile(r'(?s)\b[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\b'),
     '***JWT_MASKED***'),
    (re.compile(r'(?s)\b[A-Za-z0-9+/=]{64,}\b'),
     '***B64_TOKEN_MASKED***'),
]
for pat, rep in rules:
    s = pat.sub(rep, s)
sys.stdout.write(s)
PY
    else
        # Minimal fallback (not perfect)
        sed -E \
            -e 's/([Pp]assword|[Tt]oken|access_token|refresh_token)=([^&[:space:]]+)/\1=***MASKED***/g' \
            -e 's/"(password|token|access_token|refresh_token)"[[:space:]]*:[[:space:]]*"[^"]*"/"\1":"***MASKED***"/g'
    fi
}

# Logging function (SECURITY: masks sensitive data)
log() {
    local level=${2:-INFO}
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    # Mask sensitive data
    local message="$1"
    local logline=$(printf "[$timestamp] [$level] $message" | mask)
    echo "$logline"
    echo "$logline" >> "$LOG_FILE"
}

# Global cleanup error flag
CLEANUP_FAILED=false

# Cleanup function
cleanup() {
    log "Starting cleanup..."
    set +e  # Don't exit on cleanup errors

    local cleanup_error=false

    # Kill background processes
    if [ -n "$BACKEND_PID" ]; then
        if ! kill "$BACKEND_PID" 2>/dev/null; then
            log "Warning: Failed to kill backend process $BACKEND_PID" "WARN"
            cleanup_error=true
        else
            log "Backend process killed"
        fi
    fi

    if [ -n "$FRONTEND_PID" ]; then
        if ! kill "$FRONTEND_PID" 2>/dev/null; then
            log "Warning: Failed to kill frontend process $FRONTEND_PID" "WARN"
            cleanup_error=true
        else
            log "Frontend process killed"
        fi
    fi

    # Stop containers
    if ! docker compose -f docker-compose.e2e.yml down 2>/dev/null; then
        log "Warning: Failed to stop containers" "WARN"
        cleanup_error=true
    fi

    if [ "$cleanup_error" = true ]; then
        CLEANUP_FAILED=true
        log "Cleanup completed with errors" "ERROR"
        return 1
    else
        log "Cleanup completed successfully"
        return 0
    fi
}

# Function to wait for HTTP endpoint to become available
wait_for_url() {
    local url="$1"
    local name="$2"
    local max="${3:-30}"
    for i in $(seq 1 "$max"); do
        if curl -fsS "$url" >/dev/null 2>&1; then
            log "$name ready after ${i}s"
            return 0
        fi
        sleep 1
    done
    log "$name failed to become ready within ${max}s" "ERROR"
    return 1
}

# Error handling
trap cleanup EXIT

# Main execution
main() {
    log "=== Customer E2E CI Runner Started ==="
    log "Run ID: $RUN_ID"
    log "Repository Root: $(pwd)"
    log "Artifacts Path: $ARTIFACTS_PATH"
    log "Log File: $LOG_FILE"
    log "Docker Wait: ${DOCKER_WAIT_SECONDS}s"
    log "Backend Wait: ${BACKEND_WAIT_SECONDS}s"
    log "Frontend Wait: ${FRONTEND_WAIT_SECONDS}s"

    # ==========================================
    # STEP 1: Start E2E Database
    # ==========================================
    log "=== STEP 1: Starting E2E Database ==="

    if [ ! -f "scripts/run-e2e-db.ps1" ]; then
        log "Database startup script not found: scripts/run-e2e-db.ps1" "ERROR"
        exit 1
    fi

    # Note: This assumes PowerShell is available on Linux (e.g., via pwsh)
    if command -v pwsh >/dev/null 2>&1; then
        pwsh -ExecutionPolicy Bypass -File scripts/run-e2e-db.ps1
        db_exit_code=$?
    elif command -v powershell >/dev/null 2>&1; then
        powershell -ExecutionPolicy Bypass -File scripts/run-e2e-db.ps1
        db_exit_code=$?
    else
        log "PowerShell not found, trying direct docker compose..." "WARN"
        docker compose -f docker-compose.e2e.yml up -d
        db_exit_code=$?
    fi

    if [ $db_exit_code -ne 0 ]; then
        log "Database startup failed with exit code: $db_exit_code" "ERROR"
        exit 1
    fi

    log "Database started successfully"

    # ==========================================
    # STEP 2: Reset and Seed Database
    # ==========================================
    log "=== STEP 2: Reset and Seed Database ==="

    export PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="I explicitly consent to run prisma migrate reset and seed in CI"
    node scripts/reset-db-e2e.mjs
    seed_exit_code=$?

    if [ $seed_exit_code -ne 0 ]; then
        log "Database reset/seed failed with exit code: $seed_exit_code" "ERROR"
        exit 1
    fi

    log "Database reset and seeded successfully"

    # ==========================================
    # STEP 3: Start Backend E2E Server
    # ==========================================
    log "=== STEP 3: Starting Backend E2E Server ==="

    node scripts/start-backend-e2e.mjs &
    BACKEND_PID=$!

    log "Backend server starting in background (PID: $BACKEND_PID)"

    # Wait for backend to be ready with polling
    wait_for_url "http://127.0.0.1:3000/api/health" "Backend" "${BACKEND_WAIT_SECONDS:-30}" || exit 1

    # ==========================================
    # STEP 4: Start Customer Frontend
    # ==========================================
    log "=== STEP 4: Starting Customer Frontend ==="

    cd frontend/customer-web
    npm run dev:e2e &
    FRONTEND_PID=$!

    cd ../..
    log "Customer frontend starting in background (PID: $FRONTEND_PID)"

    # Wait for frontend to be ready with polling
    wait_for_url "http://127.0.0.1:3102/api/health" "Customer proxy" "${FRONTEND_WAIT_SECONDS:-20}" || exit 1

    # ==========================================
    # STEP 5: Run Playwright Tests
    # ==========================================
    log "=== STEP 5: Running Playwright Tests ==="

    cd frontend/customer-web

    # Set environment variables
    export CUSTOMER_URL="http://127.0.0.1:3102"
    export RUN_ID="$RUN_ID"

    # Run tests with CI configuration - STRICT: workers=1, fullyParallel=false, retries=0
    npx playwright test --project=customer-auth --config=playwright.config.ts --workers=1 --fullyParallel=false --retries=0
    test_exit_code=$?

    cd ../..
    log "Playwright tests completed with exit code: $test_exit_code"

    if [ $test_exit_code -ne 0 ]; then
        log "Playwright tests failed - HARD FAIL" "ERROR"
        # Still collect artifacts before exit
    else
        log "All Playwright tests passed!" "SUCCESS"
    fi

    # ==========================================
    # STEP 6: Collect Artifacts
    # ==========================================
    log "=== STEP 6: Collecting Artifacts ==="

    # Test results
    if [ -d "frontend/customer-web/test-results" ]; then
        cp -r "frontend/customer-web/test-results" "$ARTIFACTS_PATH/test-results-$TIMESTAMP"
        log "Test results copied to: $ARTIFACTS_PATH/test-results-$TIMESTAMP"
    fi

    # Playwright report
    if [ -d "frontend/customer-web/playwright-report" ]; then
        cp -r "frontend/customer-web/playwright-report" "$ARTIFACTS_PATH/playwright-report-$TIMESTAMP"
        log "Playwright report copied to: $ARTIFACTS_PATH/playwright-report-$TIMESTAMP"
    fi

    # ==========================================
    # SUMMARY
    # ==========================================
    log "=== Customer E2E CI Runner Summary ==="
    log "Exit Code: $test_exit_code"
    log "Artifacts: $ARTIFACTS_PATH"
    log "Log: $LOG_FILE"
    log "Duration: $(($(date +%s) - START_TIME)) seconds"

    # Return the test exit code
    final_exit_code=$test_exit_code

    # If cleanup had errors, fail the run to avoid zombie processes/ports
    if [ "$CLEANUP_FAILED" = true ] && [ $final_exit_code -eq 0 ]; then
        log "Cleanup had errors; failing the run to avoid zombie processes/ports." "ERROR"
        final_exit_code=1
    fi

    exit $final_exit_code
}

# Set up cleanup trap for deterministic error propagation
trap 'code=$?; cleanup || code=1; exit $code' EXIT

# Record start time
START_TIME=$(date +%s)

# Run main function
main "$@"