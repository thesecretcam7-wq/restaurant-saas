param(
  [int]$Port = 17777
)

function Get-AgentPing {
  $urls = @("http://localhost:$Port/ping", "http://127.0.0.1:$Port/ping")
  foreach ($url in $urls) {
    try {
      $ping = Invoke-RestMethod -Uri $url -TimeoutSec 5
      if ($ping.ok -eq $true) {
        return @{ ok = $true; url = $url; version = $ping.version; pid = $ping.pid; uptimeSeconds = $ping.uptimeSeconds }
      }
    } catch {
      continue
    }
  }

  return $null
}

function Write-AgentStatus {
  param($Ping)

  Write-Host "Activo"
  Write-Host "Version: $($Ping.version)"
  Write-Host "Direccion: $($Ping.url)"
  Write-Host "Proceso: $($Ping.pid)"
  Write-Host "Tiempo activo: $($Ping.uptimeSeconds) segundos"

  try {
    $baseUrl = $Ping.url -replace "/ping$", ""
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 6
    if ($health.ok -eq $true) {
      Write-Host "Impresora predeterminada: $($health.defaultPrinter)"
    }
  } catch {
    Write-Host "Impresora predeterminada: pendiente de leer en Windows"
  }
}

try {
  Start-ScheduledTask -TaskName "Eccofood Print Agent" -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
} catch {}

$ping = Get-AgentPing
if ($ping) {
  Write-AgentStatus -Ping $ping
} else {
  $installDir = Join-Path $env:ProgramData "EccofoodPrint"
  $starter = Join-Path $installDir "Start-EccofoodPrintAgent.ps1"
  if (-not (Test-Path $starter)) {
    $starter = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "Start-EccofoodPrintAgent.ps1"
  }
  if (Test-Path $starter) {
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$starter`" -Port $Port"
    Start-Sleep -Seconds 2
  }

  $ping = Get-AgentPing
  if ($ping) {
    Write-AgentStatus -Ping $ping
  } else {
    Write-Host "No responde en http://localhost:$Port ni en http://127.0.0.1:$Port"
    Write-Host "Reinstala Eccofood Print Agent como administrador si este mensaje se repite."
  }
}
