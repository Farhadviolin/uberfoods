@echo off
echo Starting E2E Test Run with Deterministic Servers...

REM Start Backend E2E Server in background
echo Starting Backend E2E Server on port 3000...
start /B cmd /C "cd PROJECT_ROOT_PLACEHOLDER\backend && npx ts-node --project tsconfig.build.json src/main.e2e.ts"

REM Wait for backend
timeout /t 15 /nobreak > nul

REM Check backend health
curl.exe -s -f http://127.0.0.1:3000/api/health > nul 2>&1
if errorlevel 1 (
    echo Backend health check failed!
    goto :cleanup
)
echo Backend ready!

REM Start Customer Web DEV Server in background
echo Starting Customer Web DEV Server on port 3102...
start /B cmd /C "cd PROJECT_ROOT_PLACEHOLDER\frontend\customer-web && npm run dev:e2e"

REM Wait for web server
timeout /t 20 /nobreak > nul

REM Check web server health
curl.exe -s -f http://127.0.0.1:3102 > nul 2>&1
if errorlevel 1 (
    echo Customer Web health check failed!
    goto :cleanup
)
echo Customer Web ready!

REM Test proxy
curl.exe -s -f http://127.0.0.1:3102/api/health > nul 2>&1
if errorlevel 1 (
    echo Proxy health check failed!
    goto :cleanup
)
echo Proxy working! All servers ready.

REM Run Playwright tests
echo Running Playwright customer-auth tests...
call npm run test:e2e -- --project=customer-auth
set TEST_EXIT_CODE=%errorlevel%

echo Test completed with exit code %TEST_EXIT_CODE%
goto :end

:cleanup
echo Servers failed to start properly
taskkill /F /IM node.exe /T > nul 2>&1
exit /b 1

:end
echo Cleaning up servers...
taskkill /F /IM node.exe /T > nul 2>&1
exit /b %TEST_EXIT_CODE%