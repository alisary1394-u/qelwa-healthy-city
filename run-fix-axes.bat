@echo off
cd /d "%~dp0"

echo ========================================
echo   Fix Axes Order Directly
echo ========================================
echo.

echo [1] Check if Node.js is available...
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Please install Node.js first.
  echo Alternative: Use the Settings page in the app to reset data.
  pause
  exit /b 1
)

echo [2] Run axes order fix script...
echo This will directly fix the order in localStorage (for local backend)
echo.
node fix-axes-order.js
echo.

echo [3] Instructions for other backends...
echo If you're using Supabase or Server backend:
echo 1. Open the application in browser
echo 2. Go to Settings page
echo 3. Click "مسح البيانات وإعادة تحميل بيانات التجربة"
echo 4. Login with ID: 1, Password: 123456
echo 5. This will reset axes to correct order (1-9)
echo.

echo [4] Refresh the application...
echo After fixing, refresh your browser to see the correct order.
echo.

echo ========================================
echo   Fix completed!
echo ========================================
pause
