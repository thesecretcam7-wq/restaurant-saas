$taskName = "Eccofood Print Agent"
Stop-ScheduledTask -TaskName $taskName
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*EccofoodPrintAgent.ps1*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Host "Eccofood Print Agent detenido."
