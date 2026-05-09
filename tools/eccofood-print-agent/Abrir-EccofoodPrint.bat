@echo off
set "AGENT=%ProgramData%\EccofoodPrint\EccofoodPrintAgent.ps1"
if not exist "%AGENT%" set "AGENT=%~dp0EccofoodPrintAgent.ps1"
echo Abriendo Eccofood Print Agent...
echo.
echo IMPORTANTE: deja esta ventana abierta mientras uses el TPV.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%AGENT%"
