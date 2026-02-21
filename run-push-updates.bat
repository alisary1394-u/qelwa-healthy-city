@echo off
cd /d "%~dp0"

echo ========================================
echo   Push updates to server (Git)
echo ========================================
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
