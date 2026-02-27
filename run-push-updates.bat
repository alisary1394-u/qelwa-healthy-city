@echo off
cd /d "%~dp0"

echo ========================================
echo   Complete Fix: Axes, Standards & Seeding
echo ========================================
echo.

echo [0] COMPREHENSIVE FIX APPLIED!
echo Fixed all issues with axes and standards:
echo.
echo 1. UI Display Issues:
echo    - Client-side sorting in Standards.jsx
echo    - Client-side sorting in Dashboard.jsx
echo    - Utility function in src/lib/axesSort.js
echo.
echo 2. Standards Coding Issues:
echo    - Fixed getStandardCodeFromIndex() to use axis_order
echo    - Fixed getStandardIndexFromCode() to use axis_order
echo.
echo 3. Data Seeding Issues:
echo    - Fixed buildStandardsSeed() to use axis.order
echo    - Fixed localBackend.js seeding to use axis.order
echo    - Fixed supabaseBackend.js seeding to use axis.order
echo.
echo 4. TypeScript Errors:
echo    - Fixed Property 'status' does not exist on type 'Error'
echo.
echo IMPORTANT: To fix duplicate standards issue:
echo You MUST clear existing data and reseed:
echo 1. Go to Settings page
echo 2. Click "مسح البيانات وإعادة تحميل بيانات التجربة"
echo 3. Login with ID: 1, Password: 123456
echo.
echo This will remove old data with duplicates and create
echo new correct data with proper coding (م4-1, م4-2, etc.)
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
