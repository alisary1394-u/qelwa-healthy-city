@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Pushing entity definitions to Base44 (creates/updates database tables)...
call npx base44@latest entities push
if errorlevel 1 (
  echo.
  echo If link is needed first, run: npx base44@latest link
  pause
) else (
  echo Done. Database tables are now synced with your app.
  pause
)
