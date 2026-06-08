@echo off
cd /d "%~dp0"
if "%~2"=="" (
  echo Usage: update-admin.bat username newPassword
  pause
  exit /b 1
)
node tools\update-admin.js %1 %2
pause
