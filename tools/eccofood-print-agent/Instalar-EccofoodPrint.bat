@echo off
cd /d "%~dp0"
echo Instalando Eccofood Print Agent...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
