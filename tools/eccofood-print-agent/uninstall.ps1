$ErrorActionPreference = "SilentlyContinue"

$taskName = "Eccofood Print Agent"
$installDir = Join-Path $env:ProgramData "EccofoodPrint"
$commonStartup = [Environment]::GetFolderPath("CommonStartup")
$userStartup = [Environment]::GetFolderPath("Startup")
$userDesktop = [Environment]::GetFolderPath("Desktop")
$commonDesktop = [Environment]::GetFolderPath("CommonDesktopDirectory")
$startupCmd = Join-Path $commonStartup "Eccofood Print Agent.cmd"
$userStartupCmd = Join-Path $userStartup "Eccofood Print Agent.cmd"
$commonDesktopShortcut = Join-Path $commonDesktop "Eccofood Impresora.lnk"
$userDesktopShortcut = Join-Path $userDesktop "Eccofood Impresora.lnk"
$urlAcls = @("http://localhost:17777/", "http://127.0.0.1:17777/")

Stop-ScheduledTask -TaskName $taskName
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*EccofoodPrintAgent.ps1*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Remove-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Eccofood Print Agent"
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Eccofood Print Agent"
Remove-Item -LiteralPath $startupCmd -Force
Remove-Item -LiteralPath $userStartupCmd -Force
Remove-Item -LiteralPath $commonDesktopShortcut -Force
Remove-Item -LiteralPath $userDesktopShortcut -Force
foreach ($urlAcl in $urlAcls) {
  & netsh http delete urlacl url=$urlAcl | Out-Null
}
Remove-Item -LiteralPath $installDir -Recurse -Force

Write-Host "Eccofood Print Agent eliminado."
