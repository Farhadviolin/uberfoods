@echo off
echo Starting Deterministic E2E Test Environment...

REM Start Backend
echo Starting Backend E2E Server...
start "Backend-E2E" cmd /C "cd PROJECT_ROOT_PLACEHOLDER\backend && npx ts-node --project tsconfig.build.json src/main.e2e.ts"

REM Wait
timeout /t 10 /nobreak > nul

REM Start Customer Web
echo Starting Customer Web DEV Server...
start "Customer-Web-E2E" cmd /C "cd PROJECT_ROOT_PLACEHOLDER\frontend\customer-web && npm run dev:e2e"

REM Wait for servers
timeout /t 15 /nobreak > nul

REM Run tests in new window
echo Running Playwright tests...
start "Playwright-Tests" cmd /C "cd PROJECT_ROOT_PLACEHOLDER\frontend\customer-web && npm run test:e2e -- --project=customer-auth"

echo Servers started. Tests running in separate window.
echo Press any key to stop all servers...
pause > nul

REM Cleanup
echo Stopping all servers...
taskkill /F /FI "WINDOWTITLE eq Backend-E2E*" /T > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Customer-Web-E2E*" /T > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Playwright-Tests*" /T > nul 2>&1
taskkill /F /IM node.exe /T > nul 2>&1

echo Cleanup complete.