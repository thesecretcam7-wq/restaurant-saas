@echo off
set "STARTER=%ProgramData%\EccofoodPrint\Start-EccofoodPrintAgent.ps1"
if not exist "%STARTER%" set "STARTER=%~dp0Start-EccofoodPrintAgent.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%STARTER%"
