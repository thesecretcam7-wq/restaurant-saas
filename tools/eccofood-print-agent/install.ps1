param(
  [int]$Port = 17777
)

$ErrorActionPreference = "Stop"

$installDir = Join-Path $env:ProgramData "EccofoodPrint"
$taskName = "Eccofood Print Agent"
$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$currentUser = "$env:USERDOMAIN\$env:USERNAME"
$commonStartup = [Environment]::GetFolderPath("CommonStartup")

if (-not (Test-Path $installDir)) {
  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}

Copy-Item -Path (Join-Path $sourceDir "EccofoodPrintAgent.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "start.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "stop.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "status.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "Abrir-EccofoodPrint.bat") -Destination $installDir -Force

$urlAcl = "http://127.0.0.1:$Port/"
try {
  & netsh http delete urlacl url=$urlAcl 2>$null | Out-Null
  & netsh http add urlacl url=$urlAcl user=$currentUser | Out-Null
} catch {
  Write-Host "Aviso: no pude reservar el puerto local. Si el agente no inicia, ejecuta este instalador como administrador." -ForegroundColor Yellow
}

$agentPath = Join-Path $installDir "EccofoodPrintAgent.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$agentPath`" -Port $Port"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Eccofood local printing and cash drawer agent" -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

try {
  $startupCmd = Join-Path $commonStartup "Eccofood Print Agent.cmd"
  $startupContent = @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$agentPath" -Port $Port
"@
  Set-Content -Path $startupCmd -Value $startupContent -Encoding ASCII -Force
} catch {
  Write-Host "Aviso: no pude agregar el arranque automatico para todos los usuarios." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Eccofood Print Agent instalado correctamente."
Write-Host "URL local: http://127.0.0.1:$Port"
Write-Host "La herramienta arrancara sola cuando inicie sesion en Windows."
Write-Host "Si el estado dice que no responde, ejecuta Abrir-EccofoodPrint.bat y deja la ventana abierta."
Write-Host ""
