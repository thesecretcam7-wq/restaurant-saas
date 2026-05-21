$taskName = "Eccofood Print Agent"
$installDir = Join-Path $env:ProgramData "EccofoodPrint"
$starter = Join-Path $installDir "Start-EccofoodPrintAgent.ps1"

try {
  Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
} catch {
  if (-not (Test-Path $starter)) {
    $starter = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "Start-EccofoodPrintAgent.ps1"
  }
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$starter`""
}

Write-Host "Eccofood Print Agent iniciado."
