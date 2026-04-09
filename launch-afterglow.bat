@echo off
setlocal

cd /d "%~dp0"

start "Afterglow Archive Dev Server" powershell -NoExit -ExecutionPolicy Bypass -Command "cd '%~dp0'; npm run dev"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 6; Start-Process 'http://localhost:3000/browse'"

endlocal
