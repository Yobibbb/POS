@echo off
title CartAlogue POS - Launcher
color 0A

set "SERVER_DIR=%~dp0local-server"
set "POS_DIR=%~dp0POS"

echo ============================================
echo  CartAlogue POS - Starting Services...
echo ============================================
echo.

echo Freeing port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Freeing port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo [1/2] Starting Local Server on port 3000...
start "CartAlogue Local Server" /d "%SERVER_DIR%" cmd /k "node --experimental-sqlite server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting POS (Next.js) on port 3001...
start "CartAlogue POS" /d "%POS_DIR%" cmd /k "npx next dev -p 3001"

echo.
echo Waiting for services to initialize...
timeout /t 15 /nobreak >nul

echo.
echo ============================================
echo  Service Status Check:
echo ============================================
echo.

netstat -aon | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    color 0A
    echo  [  OK  ]  Local Server  --  http://localhost:3000
) else (
    color 0C
    echo  [ FAIL ]  Local Server  --  port 3000 not responding
)

netstat -aon | findstr ":3001 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    color 0A
    echo  [  OK  ]  POS App       --  http://localhost:3001
) else (
    color 0C
    echo  [ FAIL ]  POS App       --  port 3001 not responding
)

echo.
echo ============================================
echo.
echo  Opening browser...
echo.
start "" "http://localhost:3001"
echo.
pause
