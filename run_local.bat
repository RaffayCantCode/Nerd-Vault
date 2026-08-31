@echo off
setlocal enabledelayedexpansion
title NerdVault V2 - Reincarnated

cd /d "%~dp0"
set PATH=%PATH%;C:\Program Files\nodejs

echo =========================================================
echo       NERDVAULT V2 -- REINCARNATION LOCAL RUNNER
echo =========================================================
echo.
echo Starting backend API server (port 5000) and frontend (port 3000)...
echo.

start "NerdVault V2 Dev Server" cmd.exe /k "cd /d ""%~dp0"" && node dev-runner.mjs"

echo Waiting for servers to initialize...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:3000'"

echo.
echo NerdVault V2 is launching in your browser at http://localhost:3000
echo.
endlocal
