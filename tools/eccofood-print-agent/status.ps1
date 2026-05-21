try {
  Start-ScheduledTask -TaskName "Eccofood Print Agent" -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
} catch {}

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:17777/health" -TimeoutSec 2
  Write-Host "Activo"
  Write-Host "Impresora predeterminada: $($health.defaultPrinter)"
} catch {
  $installDir = Join-Path $env:ProgramData "EccofoodPrint"
  $starter = Join-Path $installDir "Start-EccofoodPrintAgent.ps1"
  if (-not (Test-Path $starter)) {
    $starter = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "Start-EccofoodPrintAgent.ps1"
  }
  if (Test-Path $starter) {
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$starter`""
    Start-Sleep -Seconds 2
  }

  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:17777/health" -TimeoutSec 2
    Write-Host "Activo"
    Write-Host "Impresora predeterminada: $($health.defaultPrinter)"
  } catch {
    Write-Host "No responde en http://127.0.0.1:17777"
    Write-Host "Abre Abrir-EccofoodPrint.bat y deja esa ventana abierta mientras uses el TPV."
  }
}
