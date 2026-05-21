param(
  [int]$Port = 17777
)

$ErrorActionPreference = "Stop"

$installDir = Join-Path $env:ProgramData "EccofoodPrint"
$agentPath = Join-Path $installDir "EccofoodPrintAgent.ps1"
$logPath = Join-Path $installDir "startup.log"

function Write-StartupLog {
  param([string]$Message)
  if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  }
  Add-Content -Path $logPath -Value "[$(Get-Date -Format s)] $Message"
}

function Test-AgentHealth {
  $urls = @("http://localhost:$Port/ping", "http://127.0.0.1:$Port/ping")
  foreach ($url in $urls) {
  try {
      $health = Invoke-RestMethod -Uri $url -TimeoutSec 5
      if ($health.ok -eq $true) { return $true }
  } catch {
      continue
    }
  }
  return $false
}

function Stop-StaleAgents {
  try {
    Get-CimInstance Win32_Process |
      Where-Object { $_.CommandLine -like "*EccofoodPrintAgent.ps1*" } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  } catch {
    Write-StartupLog "No se pudo limpiar instancia anterior: $($_.Exception.Message)"
  }
}

try {
  if (Test-AgentHealth) {
    Write-StartupLog "El agente ya estaba activo en el puerto $Port."
    exit 0
  }

  if (-not (Test-Path $agentPath)) {
    throw "No se encontro $agentPath"
  }

  Stop-StaleAgents

  Write-StartupLog "Iniciando agente oculto en el puerto $Port."
  Start-Process powershell.exe `
    -WindowStyle Hidden `
    -WorkingDirectory $installDir `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$agentPath`" -Port $Port"

  Start-Sleep -Seconds 3
  if (Test-AgentHealth) {
    Write-StartupLog "Agente activo."
  } else {
    Write-StartupLog "Agente iniciado; health pendiente."
  }

  exit 0
} catch {
  Write-StartupLog "Error al iniciar: $($_.Exception.Message)"
  exit 1
}
