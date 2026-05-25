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

$urls = @("http://localhost:$Port/ping", "http://127.0.0.1:$Port/ping")
foreach ($url in $urls) {
  try {
    $health = Invoke-RestMethod -Uri $url -TimeoutSec 5
    if ($health.ok -eq $true) {
      Write-Host "Eccofood Print Agent activo. Version: $($health.version)"
      Write-Host "Direccion: $url"
      exit 0
    }
  } catch {
    continue
  }
}

Write-Host "No responde en http://localhost:$Port ni en http://127.0.0.1:$Port. Ejecuta Estado-EccofoodPrint.bat para revisar."
exit 1
