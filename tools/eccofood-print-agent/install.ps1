param(
  [int]$Port = 17777
)

$ErrorActionPreference = "Stop"

$installDir = Join-Path $env:ProgramData "EccofoodPrint"
$taskName = "Eccofood Print Agent"
$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$commonStartup = [Environment]::GetFolderPath("CommonStartup")
$userStartup = [Environment]::GetFolderPath("Startup")
$userDesktop = [Environment]::GetFolderPath("Desktop")
$commonDesktop = [Environment]::GetFolderPath("CommonDesktopDirectory")
$shortcutName = "Eccofood Impresora.lnk"

if (-not (Test-Path $installDir)) {
  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}

Copy-Item -Path (Join-Path $sourceDir "EccofoodPrintAgent.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "Start-EccofoodPrintAgent.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "start.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "stop.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "status.ps1") -Destination $installDir -Force
Copy-Item -Path (Join-Path $sourceDir "Abrir-EccofoodPrint.bat") -Destination $installDir -Force

$iconPath = Join-Path $installDir "eccofood-print-agent.ico"
$iconBase64 = "AAABAAEAICAAAAAAIAB5BAAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAgAAAAIAgGAAAAc3p69AAABEBJREFUeJztl8tvVHUUxz+/3+8+Zu7MdKadGVrbUilPK69iAqI1CimNC6OJRjeE0LjQuHBjYtwQE/8AtoaNLgjRGFkYYzQufBAivgAJsVhMqNS+bBGm08e8596fudOWYujQDjRhw0nOzS/3/s45398553fOuQLQ3EeS99P4AwA+GffqQuGz8Nl/zGWU1uD5jxXK67sxLCuWwfOqKBaiAszz9OoCEPMHXdBrmYrWNTZNCZugY5IrS4ZGs4yMTd/cfydniFoA+KdeMLy5NUB3Z5juXQ57d4ZpaY9CWys38msZGFaMXhng/WNn+PaniYo3dBUURi0n942HgoreAzE2x10CMkNbRJMMB8kVNLPjJqP5ADs25tnTmqKrLs6bR7Oc/GHmf+Br9oCYd2NT3OL4uxuRk+Ncu5GlvT1B/78mX5/NcPFKllzOJRF36N63jsO705w+NUzfkOLCP4Jf/swuGQ6xHABfyN/m2ILPju2mZ1uB8cEUWaOJIx9M8MlXI6Dd2+Qe2+Lw7COaU31F0q5F/2Cuaj7oauyHzjREZX3wQIPOfb9de2c79XT/K7q7q63yXkqpTWOOlRRaSqGVkhqB3tqmtGPPyd+BWW6Dtkyp33qhXr/3vNSXT2zSbxzadvObugP4pda37WOJECy4asvDIZoabChrHG+WoCzRtSfBN38IggFF59Yorhnlr5FJtJCcOz/O5YGpm1m/3BX0aclb4AsFLEljWCNzGTzXxXQ0DyVt6swCJ95pIr6rGR3ewESujaboMJfODPDir2PzObOoZzkS1ZLQMvxKpimVobPdRHmaZEOAkWm4Pl1CK4nUguaYieMIzvalyRaXLzzLekDMI1JKsG97lJGJPOsSCktKohGDlqSipTFCotFCWmCEApSJMXTtdwZHs4t6VgjEqOaTRJ1ieHyGUtHFwGIyXWJqCtY1WzRHHTofDaHqItgNcU6cHKsA9YVvjf1KQIhqIVAS3PlGs7cjhuNlsFWZSGINn56eWFqZ8Mu1wPU09VGbyanC3U9ErreIMJvJ0NEepD6geXJ9icc7YpVvhgLDEFimrITMP61vvGtHjDPHd/PyMw2YhpzrnLUCWCAhBX3DJUQ4zHNPx5idSvNaj81TO+opu5JyWVMsebiupjHp8Hbveo6+3sB3n5+jXhbY1Bqq9IBqIMRKeoEvbNsGR3qb2RBIcb5/lkQyihkJkSoq7Eigchue6AigCjN8+PEApy9Dqhzg6kQet+xVNSJqaUbSkBzuiZFQBSIqx6svxVm7fxOk8pz68io/X5imb9Dl7ynJ9YLJwFiRUnmVBhJxS0a3Nwc5uD9E76Gd1DdaXP3xNz76YpKLQx5DKU0q45HO+LPZCvRS40R0a19vSYYIBSW5UpFc3iU941ZyohYSdzMTLpTbpe74Qq6tVKm4lz+jucF0cdyqpQSvCoDVILkqWh4AuAe67wD+A6wnzXc+4txGAAAAAElFTkSuQmCC"
[IO.File]::WriteAllBytes($iconPath, [Convert]::FromBase64String($iconBase64))

function New-EccofoodDesktopShortcut {
  param([string]$DesktopPath)

  if ([string]::IsNullOrWhiteSpace($DesktopPath)) { return $false }
  if (-not (Test-Path $DesktopPath)) { return $false }

  $shortcutPath = Join-Path $DesktopPath $shortcutName
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = Join-Path $installDir "Abrir-EccofoodPrint.bat"
  $shortcut.WorkingDirectory = $installDir
  $shortcut.IconLocation = "$iconPath,0"
  $shortcut.Description = "Abrir Eccofood Print Agent"
  $shortcut.Save()
  return $true
}

$desktopShortcutCreated = $false
try {
  $desktopShortcutCreated = New-EccofoodDesktopShortcut -DesktopPath $commonDesktop
} catch {
  Write-Host "Aviso: no pude crear el acceso directo para todos los usuarios." -ForegroundColor Yellow
}

if (-not $desktopShortcutCreated) {
  try {
    $desktopShortcutCreated = New-EccofoodDesktopShortcut -DesktopPath $userDesktop
  } catch {
    Write-Host "Aviso: no pude crear el acceso directo en este escritorio." -ForegroundColor Yellow
  }
}

$urlAcls = @("http://localhost:$Port/", "http://127.0.0.1:$Port/")
foreach ($urlAcl in $urlAcls) {
  try {
    & netsh http delete urlacl url=$urlAcl 2>$null | Out-Null
    & netsh http add urlacl url=$urlAcl sddl="D:(A;;GX;;;WD)" | Out-Null
  } catch {
    Write-Host "Aviso: no pude reservar $urlAcl. Si el agente no inicia, ejecuta este instalador como administrador." -ForegroundColor Yellow
  }
}

$agentPath = Join-Path $installDir "EccofoodPrintAgent.ps1"
$startupPath = Join-Path $installDir "Start-EccofoodPrintAgent.ps1"
$startupCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupPath`" -Port $Port"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$agentPath`" -Port $Port"
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$startupCmd = Join-Path $commonStartup "Eccofood Print Agent.cmd"
$userStartupCmd = Join-Path $userStartup "Eccofood Print Agent.cmd"
$scheduledTaskCreated = $false

function Test-AgentReady {
  param(
    [int]$Attempts = 1,
    [int]$DelayMs = 800
  )

  $urls = @("http://localhost:$Port/ping", "http://127.0.0.1:$Port/ping")
  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    foreach ($url in $urls) {
      try {
        $ping = Invoke-RestMethod -Uri $url -TimeoutSec 5
        if ($ping.ok -eq $true) {
          return @{ ok = $true; url = $url; version = $ping.version }
        }
      } catch {
        continue
      }
    }

    if ($attempt -lt $Attempts) {
      Start-Sleep -Milliseconds $DelayMs
    }
  }

  return $null
}

Remove-Item -LiteralPath $startupCmd -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $userStartupCmd -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Eccofood Print Agent" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Eccofood Print Agent" -ErrorAction SilentlyContinue

try {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($logonTrigger, $startupTrigger) -Principal $principal -Settings $settings -Description "Eccofood local printing and cash drawer agent" -Force | Out-Null
  $scheduledTaskCreated = $true
} catch {
  Write-Host "Aviso: no pude crear la tarea programada. Se usara el arranque automatico del usuario." -ForegroundColor Yellow
}

if (-not $scheduledTaskCreated) {
  try {
    New-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Eccofood Print Agent" -Value $startupCommand -PropertyType String -Force | Out-Null
  } catch {
    Write-Host "Aviso: no pude agregar el arranque automatico del usuario en Windows Run." -ForegroundColor Yellow
  }
}

try {
  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like "*EccofoodPrintAgent.ps1*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
} catch {
  Write-Host "Aviso: no pude detener una instancia anterior del agente." -ForegroundColor Yellow
}

if ($scheduledTaskCreated) {
  try {
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
  } catch {
    Write-Host "Aviso: no pude iniciar la tarea programada ahora. Intentare iniciar el agente directo en segundo plano." -ForegroundColor Yellow
    Start-Process powershell.exe -WindowStyle Hidden -WorkingDirectory $installDir -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$startupPath`" -Port $Port"
  }
} else {
  Start-Process powershell.exe -WindowStyle Hidden -WorkingDirectory $installDir -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$startupPath`" -Port $Port"
}

$ready = Test-AgentReady -Attempts 10 -DelayMs 900
if ($ready) {
  Write-Host "Agente activo en segundo plano. Version: $($ready.version)" -ForegroundColor Green
  Write-Host "Chequeo local: $($ready.url)" -ForegroundColor Green
} else {
  Write-Host "Aviso: el agente quedo programado, pero todavia no respondio al chequeo inicial." -ForegroundColor Yellow
  Write-Host "Espera unos segundos y ejecuta Estado-EccofoodPrint.bat. Si no responde, reinstala como administrador." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Eccofood Print Agent instalado correctamente."
Write-Host "URL local: http://localhost:$Port"
Write-Host "La herramienta arrancara sola con Windows en segundo plano."
Write-Host "No necesitas dejar PowerShell abierto."
Write-Host ""
