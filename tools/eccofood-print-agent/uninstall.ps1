$ErrorActionPreference = "SilentlyContinue"

$taskName = "Eccofood Print Agent"
$installDir = Join-Path $env:ProgramData "EccofoodPrint"

Stop-ScheduledTask -TaskName $taskName
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*EccofoodPrintAgent.ps1*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Remove-Item -LiteralPath $installDir -Recurse -Force

Write-Host "Eccofood Print Agent eliminado."
