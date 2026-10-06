@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js bulunamadi. Node.js 22 veya daha yeni surumunu kurun.
  pause
  exit /b 1
)
if not exist dist\index.html (
  echo Ilk calistirma: oyun derleniyor, birkac dakika surebilir...
  call npm install
  if errorlevel 1 goto fail
  call npm run build
  if errorlevel 1 goto fail
)
node serve.mjs --open
exit /b 0
:fail
echo Derleme basarisiz oldu. Yukaridaki hatayi kontrol edin.
pause
exit /b 1
