@echo off
cd /d "%~dp0"

echo ========================================
echo   Fix Axes Order & Standards Coding
echo ========================================
echo.

echo [0] Comprehensive fix applied!
echo The application now correctly handles both:
echo 1. Axes ordering (1-9) in UI
echo 2. Standards coding (م4-1, م4-2, etc.)
echo.
echo Changes made:
echo - Added client-side sorting in Standards.jsx
echo - Added client-side sorting in Dashboard.jsx  
echo - Created utility function in src/lib/axesSort.js
echo - Fixed getStandardCodeFromIndex() to use axis_order
echo - Fixed getStandardIndexFromCode() to use axis_order
echo.
echo Now each standard will have correct coding:
echo - Axis 4: م4-1, م4-2, ... م4-11
echo - Axis 5: م5-1, م5-2, ... م5-26
echo - And so on for all axes (1-9)
echo.
echo Press any key to continue to Git push...
pause > nul
echo.

echo [1] Check Git...
git rev-parse --is-inside-work-tree 2>nul
if errorlevel 1 (
  echo Not a Git repo. Run first: git init
  echo Then: git remote add origin YOUR_REPO_URL
  pause
  exit /b 1
)

echo [2] Check remote...
git remote get-url origin 2>nul
if errorlevel 1 (
  echo No remote "origin". Add it: git remote add origin YOUR_REPO_URL
  pause
  exit /b 1
)
echo OK.
echo.

echo [3] Add all changes...
git add .
echo OK.
echo.

echo [4] Commit...
set "MSG=Qelwa Healthy City updates"
if not "%~1"=="" set "MSG=%~1"
git commit -m "%MSG%"
if errorlevel 1 (
  echo Nothing to commit. Will push existing commits only.
) else (
  echo Committed.
)
echo.

echo [5] Push to server...
git push
if errorlevel 1 (
  echo.
  echo Push failed. Try in terminal: git push -u origin main
  echo Or: git push -u origin master
  echo Check: internet, GitHub repo, login.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Push done. Railway will deploy if linked.
echo ========================================
pause
