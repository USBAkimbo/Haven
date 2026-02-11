@echo off
title Haven Server
color 0A
echo.
echo  ========================================
echo       HAVEN - Private Chat Server
echo  ========================================
echo.

:: Kill any existing Haven server on port 3000
echo  [*] Checking for existing server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo  [!] Killing existing process on port 3000 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

:: Check Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Download it from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js found: & node -v

:: Check if node_modules exists
if not exist "%~dp0node_modules\" (
    echo  [*] First run detected - installing dependencies...
    cd /d "%~dp0"
    npm install
    echo.
)

:: Check .env exists
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        echo  [*] Creating .env from template...
        copy "%~dp0.env.example" "%~dp0.env" >nul
    )
    echo  [!] IMPORTANT: Edit .env and change your settings before going live!
    echo.
)

echo  [*] Starting Haven server...
echo.

:: Start server in background
cd /d "%~dp0"
start /B node server.js

:: Wait for server to be ready
echo  [*] Waiting for server to start...
set RETRIES=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
set /a RETRIES+=1
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if %RETRIES% GEQ 15 (
        color 0C
        echo  [ERROR] Server failed to start after 15 seconds.
        echo  Check the output above for errors.
        pause
        exit /b 1
    )
    goto WAIT_LOOP
)

echo.
echo  ========================================
echo    Haven is LIVE on port 3000 (HTTPS)
echo  ========================================
echo.
echo  Local:    https://localhost:3000
echo  LAN:      https://YOUR_LOCAL_IP:3000
echo  Remote:   https://YOUR_PUBLIC_IP:3000
echo.
echo  First time? Your browser will show a security
echo  warning (self-signed cert). Click "Advanced"
echo  then "Proceed" to continue.
echo.

:: Open browser
echo  [*] Opening browser...
start https://localhost:3000

echo.
echo  ----------------------------------------
echo   Server is running. Close this window
echo   or press Ctrl+C to stop the server.
echo  ----------------------------------------
echo.

:: Keep window open so server stays alive
:KEEPALIVE
timeout /t 3600 /nobreak >nul
goto KEEPALIVE
