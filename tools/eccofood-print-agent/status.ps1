param(
  [int]$Port = 17777
)

try {
  Start-ScheduledTask -TaskName "Eccofood Print Agent" -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
} catch {}

try {
  $health = Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 2
  Write-Host "Activo"
  Write-Host "Version: $($health.version)"
  Write-Host "Direccion: http://localhost:$Port"
  Write-Host "Impresora predeterminada: $($health.defaultPrinter)"
  Write-Host "Proceso: $($health.pid)"
  Write-Host "Tiempo activo: $($health.uptimeSeconds) segundos"
} catch {
  $installDir = Join-Path $env:ProgramData "EccofoodPrint"
  $starter = Join-Path $installDir "Start-EccofoodPrintAgent.ps1"
  if (-not (Test-Path $starter)) {
    $starter = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "Start-EccofoodPrintAgent.ps1"
  }
  if (Test-Path $starter) {
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$starter`" -Port $Port"
    Start-Sleep -Seconds 2
  }

  try {
    $health = Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 2
    Write-Host "Activo"
    Write-Host "Version: $($health.version)"
    Write-Host "Direccion: http://localhost:$Port"
    Write-Host "Impresora predeterminada: $($health.defaultPrinter)"
  } catch {
    Write-Host "No responde en http://localhost:$Port ni en http://127.0.0.1:$Port"
    Write-Host "Reinstala Eccofood Print Agent como administrador si este mensaje se repite."
  }
}
