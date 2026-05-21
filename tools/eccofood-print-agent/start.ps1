param(
  [int]$Port = 17777
)

$taskName = "Eccofood Print Agent"
$installDir = Join-Path $env:ProgramData "EccofoodPrint"
$starter = Join-Path $installDir "Start-EccofoodPrintAgent.ps1"

if (-not (Test-Path $starter)) {
  $starter = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "Start-EccofoodPrintAgent.ps1"
}

try {
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
} catch {
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$starter`" -Port $Port"
}

Start-Sleep -Seconds 2

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
  if ($health.ok -eq $true) {
    Write-Host "Eccofood Print Agent activo. Version: $($health.version)"
    Write-Host "Impresora predeterminada: $($health.defaultPrinter)"
    exit 0
  }
} catch {}

Write-Host "No responde en http://127.0.0.1:$Port. Ejecuta Estado-EccofoodPrint.bat para revisar."
exit 1
