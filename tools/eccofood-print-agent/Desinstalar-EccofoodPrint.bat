@echo off
cd /d "%~dp0"
echo Desinstalando Eccofood Print Agent...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
echo.
pause
