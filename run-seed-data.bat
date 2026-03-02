@echo off
echo ====================================
echo اضافة بيانات تجريبية للنظام
echo ====================================
echo.

if "%SEED_API_URL%"=="" (
  set SEED_API_URL=http://localhost:8080
)

echo سيتم الاتصال بـ: %SEED_API_URL%
echo.

node scripts/seed-sample-data.js

if errorlevel 1 (
  echo.
  echo حدث خطأ اثناء البذر. تاكد ان السيرفر يعمل: npm run server
)

echo.
echo ====================================
echo انتهى تنفيذ السكريبت
echo ====================================
pause
