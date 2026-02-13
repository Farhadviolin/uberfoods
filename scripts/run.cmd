@echo off
REM UberFoods Command Runner - CMD
REM Usage: scripts\run.cmd "<label>" "<command>"
REM Example: scripts\run.cmd "backend-build" "cd backend && npm run build"

if "%~2"=="" (
    echo ERROR: Usage: scripts\run.cmd "label" "command"
    echo Example: scripts\run.cmd "backend-build" "cd backend && npm run build"
    exit /b 1
)

set LABEL=%~1
set COMMAND=%~2

REM Create logs directory if it doesn't exist
if not exist "docs\verification\run-logs" mkdir "docs\verification\run-logs"

REM Log file path
set LOGFILE=docs\verification\run-logs\%LABEL%.log

echo ==================================================== >> "%LOGFILE%"
echo RUNNER: %LABEL% >> "%LOGFILE%"
echo TIMESTAMP: %DATE% %TIME% >> "%LOGFILE%"
echo COMMAND: %COMMAND% >> "%LOGFILE%"
echo ==================================================== >> "%LOGFILE%"

echo.
echo 🚀 Executing: %LABEL%
echo 📝 Logging to: %LOGFILE%
echo.

REM Execute command and capture output
echo [%DATE% %TIME%] STARTING: %COMMAND% >> "%LOGFILE%"
%COMMAND% >> "%LOGFILE%" 2>&1
set EXITCODE=%ERRORLEVEL%

echo. >> "%LOGFILE%"
echo [%DATE% %TIME%] FINISHED with exit code: %EXITCODE% >> "%LOGFILE%"
echo ==================================================== >> "%LOGFILE%"

echo.
echo ✅ Execution complete
echo 📄 Exit code: %EXITCODE%
echo 📝 Full log: %LOGFILE%
echo.

exit /b %EXITCODE%