@echo off
chcp 65001 >nul
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo [خطأ] Node.js غير مثبت أو غير مضاف لـ PATH.
  echo.
  echo ثبّت Node.js من: https://nodejs.org
  echo اختر النسخة LTS ثم أعد تشغيل الكمبيوتر أو افتح cmd جديدة.
  pause
  exit /b 1
)

echo تثبيت التبعيات إن لم تكن مثبتة...
call npm install
if errorlevel 1 (
  echo فشل التثبيت. تأكد من اتصال الإنترنت وتثبيت Node.js من https://nodejs.org
  pause
  exit /b 1
)
if not exist "node_modules\vite" (
  echo [خطأ] لم يتم تثبيت التبعيات. جرّب تشغيل: npm install
  pause
  exit /b 1
)
echo.
echo تشغيل التطبيق (متاح من الجوال على نفس الـ Wi-Fi)...
echo على الكمبيوتر: http://localhost:5173
echo على الجوال: استخدم العنوان الذي يظهر أدناه (مثل http://192.168.x.x:5173)
echo للإيقاف: اضغط Ctrl+C
echo.
call npx vite --host
pause
