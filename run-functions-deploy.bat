@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Deploying Base44 functions...
call npx base44@latest functions deploy --yes
if errorlevel 1 (
  echo.
  echo If "base44 link" is needed, run: npx base44@latest link
  pause
) else (
  echo Done.
  pause
)
