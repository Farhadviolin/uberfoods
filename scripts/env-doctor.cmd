@echo off
REM UberFoods Environment Doctor - CMD
echo ====================================================
echo 🔍 UBERFOODS ENVIRONMENT DOCTOR - CMD
echo ====================================================
echo.

echo 📊 SYSTEM INFORMATION
echo ---------------------
ver
echo Current User:
whoami
echo.

echo 🔧 DEVELOPMENT TOOLS
echo -------------------

echo|set /p="Git: "
where git >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    git --version
) else (
    echo NOT FOUND in PATH
)

echo|set /p="Node.js: "
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    node -v
) else (
    echo NOT FOUND in PATH
)

echo|set /p="NPM: "
where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    npm -v
) else (
    echo NOT FOUND in PATH
)

echo|set /p="PNPM: "
where pnpm >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    pnpm -v
) else (
    echo NOT FOUND in PATH
)

echo|set /p="Yarn: "
where yarn >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    yarn -v
) else (
    echo NOT FOUND in PATH
)

echo|set /p="Docker: "
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    docker version 2>nul
    if %errorlevel% neq 0 (
        echo FOUND but version check failed
    )
) else (
    echo NOT FOUND in PATH
)

echo|set /p="Docker Compose: "
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    docker compose version 2>nul
    if %errorlevel% neq 0 (
        echo FOUND but compose check failed
    )
) else (
    echo NOT FOUND in PATH
)

echo|set /p="Curl: "
where curl >nul 2>&1
if %errorlevel% equ 0 (
    echo|set /p=""
    curl --version 2>nul | findstr /B "curl"
) else (
    echo NOT FOUND in PATH
)

echo.
echo 🌍 ENVIRONMENT
echo -------------
echo Current Directory:
cd
echo.
echo PATH Summary:
echo %PATH% | find /C ";"
echo.

echo 📋 SUMMARY
echo ---------
echo Environment doctor completed via CMD.
echo Check results above for any missing tools.
echo.
echo ✅ ENV-DOCTOR COMPLETE