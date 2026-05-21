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

try {
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
    if ($health.ok -eq $true) {
      Write-StartupLog "El agente ya estaba activo en el puerto $Port."
      exit 0
    }
  } catch {
    Write-StartupLog "El agente no respondia; se intentara iniciar."
  }

  if (-not (Test-Path $agentPath)) {
    throw "No se encontro $agentPath"
  }

  Write-StartupLog "Iniciando agente en el puerto $Port."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $agentPath -Port $Port
} catch {
  Write-StartupLog "Error al iniciar: $($_.Exception.Message)"
  throw
}
