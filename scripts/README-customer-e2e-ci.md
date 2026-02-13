# Customer E2E CI/CD Integration

This directory contains production-ready scripts for running Customer E2E tests in CI/CD pipelines.

## 🚀 Quick Start

### Windows (PowerShell)
```powershell
# From repository root
./scripts/run-customer-e2e-ci.ps1
```

### Linux/macOS (Bash)
```bash
# From repository root
chmod +x scripts/run-customer-e2e-ci.sh
./scripts/run-customer-e2e-ci.sh
```

## 📋 Pipeline Overview

The scripts execute a deterministic sequence:

1. **Database**: Start PostgreSQL E2E container
2. **Reset**: Migrate & seed database
3. **Backend**: Start Express API server
4. **Frontend**: Start Customer Web (Vite dev server)
5. **Tests**: Run Playwright customer-auth tests
6. **Artifacts**: Collect logs & test results

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCKER_WAIT_SECONDS` | 300 | Docker startup timeout |
| `BACKEND_WAIT_SECONDS` | 30 | Backend startup wait time |
| `FRONTEND_WAIT_SECONDS` | 20 | Frontend startup wait time |
| `ARTIFACTS_PATH` | `artifacts/e2e-customer` | Output directory |

### PowerShell Parameters

```powershell
./scripts/run-customer-e2e-ci.ps1 `
    -DockerWaitSeconds 300 `
    -BackendWaitSeconds 30 `
    -FrontendWaitSeconds 20 `
    -ArtifactsPath "artifacts/e2e-customer" `
    -SkipCleanup:$false
```

## 🔍 Health Checks

Scripts perform automatic health validation:

- **Database**: PostgreSQL connectivity on port 5433
- **Backend**: `GET /api/health` → 200 OK
- **Frontend**: `GET /api/health` (proxy) → 200 OK

## 📊 Exit Codes

- `0`: All tests passed ✅
- `1`: Tests failed ❌
- `2`: Infrastructure setup failed ❌

## 🎯 CI/CD Integration Examples

### GitHub Actions (Windows)

```yaml
name: Customer E2E Tests
on: [push, pull_request]

jobs:
  customer-e2e:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run Customer E2E
        run: ./scripts/run-customer-e2e-ci.ps1
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: customer-e2e-results
          path: artifacts/e2e-customer/
```

### GitHub Actions (Ubuntu)

```yaml
name: Customer E2E Tests
on: [push, pull_request]

jobs:
  customer-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install PowerShell (for DB script)
        run: |
          wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
          sudo dpkg -i packages-microsoft-prod.deb
          sudo apt-get update
          sudo apt-get install -y powershell
      - name: Run Customer E2E
        run: ./scripts/run-customer-e2e-ci.sh
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: customer-e2e-results
          path: artifacts/e2e-customer/
```

### Azure DevOps (Windows)

```yaml
trigger:
  - main

pool:
  vmImage: 'windows-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'

  - script: ./scripts/run-customer-e2e-ci.ps1
    displayName: 'Run Customer E2E Tests'

  - task: PublishBuildArtifacts@1
    displayName: 'Publish Test Results'
    condition: always()
    inputs:
      pathToPublish: 'artifacts/e2e-customer'
      artifactName: 'customer-e2e-results'
```

## 📁 Artifacts

Scripts collect comprehensive artifacts:

```
artifacts/e2e-customer/
├── customer-e2e-ci-20260102-093000.log    # Execution log
├── test-results-20260102-093000/          # Playwright results
│   ├── index.html                         # HTML report
│   └── ...
└── playwright-report-20260102-093000/    # Detailed traces
    ├── index.html
    └── ...
```

## 🐛 Debugging

### Skip Cleanup (for investigation)
```powershell
./scripts/run-customer-e2e-ci.ps1 -SkipCleanup
```

### Custom Timeouts
```bash
BACKEND_WAIT_SECONDS=60 FRONTEND_WAIT_SECONDS=30 ./scripts/run-customer-e2e-ci.sh
```

### Manual Step Execution
```powershell
# Just start infrastructure
./scripts/run-customer-e2e-ci.ps1 -SkipCleanup

# Then run tests manually
cd frontend/customer-web
$env:CUSTOMER_URL="http://127.0.0.1:3102"
npx playwright test --project=customer-auth
```

## 🚨 Troubleshooting

### Common Issues

**Docker not available**
```
Error: Docker Engine not running
```
→ Ensure Docker Desktop is running and accessible

**Port conflicts**
```
Error: Port 5433/3000/3102 already in use
```
→ Scripts will detect and fail cleanly

**Database connection timeout**
```
Error: Database startup failed
```
→ Check Docker Desktop WSL configuration

### Logs & Debugging

- **Execution logs**: Check `$ARTIFACTS_PATH/*.log`
- **Test traces**: Open `playwright-report/index.html`
- **Screenshots**: Check `test-results/` on failures

## 🔒 Security Notes

- Scripts use isolated E2E database
- No production data is touched
- Test users have minimal privileges
- All cleanup happens automatically

## 📈 Performance

Typical execution times:
- **Database**: 5-15 seconds
- **Backend**: 30 seconds
- **Frontend**: 20 seconds
- **Tests**: 5-10 seconds
- **Total**: ~1-2 minutes

## 🎯 Best Practices

1. **Run on every PR**: Catch regressions early
2. **Parallel execution**: Use separate runners if possible
3. **Artifact retention**: Keep logs for 30 days
4. **Alert on failures**: Set up notifications
5. **Regular maintenance**: Update dependencies quarterly