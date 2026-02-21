@echo off
title Qelwa Healthy City - Dev Server
echo.
echo ========================================
echo   Qelwa Healthy City - Dev Server
echo ========================================
echo.

cd /d "%~dp0"
if errorlevel 1 (
  echo [ERROR] Could not change to project folder.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org
  echo         Choose LTS, then restart PC or open a new cmd window.
  pause
  exit /b 1
)

echo Installing dependencies (may take 1-2 min first time)...
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed. Check internet and Node.js.
  pause
  exit /b 1
)
if not exist "node_modules\vite" (
  echo [ERROR] Dependencies missing. Try: npm install
  pause
  exit /b 1
)
echo.
echo Starting server...
echo.
echo   ---> Open in browser: http://localhost:5173
echo   ---> To stop: Press Ctrl+C in this window
echo.
call npx vite
if errorlevel 1 (
  echo.
  echo [ERROR] Server stopped. See messages above.
)
echo.
pause
