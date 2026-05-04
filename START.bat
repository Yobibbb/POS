@echo off
title CartAlogue POS - Launcher
color 0A

set "SERVER_DIR=C:\xampp\htdocs\CARTALOUGE APP"
set "POS_DIR=%~dp0"

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

echo [1/2] Starting CartAlogue App Server on port 3000...
pushd "%SERVER_DIR%"
start "CartAlogue App Server" cmd /k "node server.js"
popd

timeout /t 3 /nobreak >nul

echo [2/2] Starting POS (Next.js) on port 3001...
pushd "%POS_DIR%"
start "CartAlogue POS" cmd /k "npx next dev -p 3001"
popd

echo.
echo Waiting for POS to be ready (this may take up to 60 seconds)...
set /a _wait=0
:wait_loop
timeout /t 2 /nobreak >nul
set /a _wait+=2
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto ready
if %_wait% GEQ 90 goto ready
echo  Still waiting... (%_wait%s)
goto wait_loop

:ready
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
