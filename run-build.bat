@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Building...
call npm run build
if errorlevel 1 (echo Build failed. & pause) else (echo Build OK. & pause)
