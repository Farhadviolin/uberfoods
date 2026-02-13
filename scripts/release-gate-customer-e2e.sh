#!/bin/bash
# Release Gate - Customer E2E Quality Assurance
# Minimal orchestration - delegates all logic to specialized CI scripts

set -e

# Parse arguments
SKIP_E2E=false
PLATFORM="auto"

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-e2e)
      SKIP_E2E=true
      shift
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Auto-detect platform
if [ "$PLATFORM" = "auto" ]; then
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        PLATFORM="windows"
    else
        PLATFORM="linux"
    fi
fi

echo "=== Release Gate: Customer E2E Quality Assurance ==="
echo "Platform: $PLATFORM"
echo "Skip E2E: $SKIP_E2E"

if [ "$SKIP_E2E" = true ]; then
    echo "⚠️  E2E tests skipped via --skip-e2e flag"
    exit 0
fi

# Change to repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

if [ "$PLATFORM" = "windows" ]; then
    CI_SCRIPT="$SCRIPT_DIR/run-customer-e2e-ci.ps1"

    if [ ! -f "$CI_SCRIPT" ]; then
        echo "❌ Windows CI script not found: $CI_SCRIPT"
        exit 1
    fi

    echo "🚀 Running Customer E2E on Windows..."
    powershell -ExecutionPolicy Bypass -File "$CI_SCRIPT"

elif [ "$PLATFORM" = "linux" ]; then
    CI_SCRIPT="$SCRIPT_DIR/run-customer-e2e-ci.sh"

    if [ ! -f "$CI_SCRIPT" ]; then
        echo "❌ Linux CI script not found: $CI_SCRIPT"
        exit 1
    fi

    chmod +x "$CI_SCRIPT"
    echo "🚀 Running Customer E2E on Linux..."
    "$CI_SCRIPT"

else
    echo "❌ Unsupported platform: $PLATFORM"
    echo "Supported: windows, linux, auto"
    exit 1
fi

exit_code=$?
echo "=== Release Gate Complete ==="
echo "Exit Code: $exit_code"

exit $exit_code