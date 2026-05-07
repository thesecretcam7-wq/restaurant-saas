$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$source = Join-Path $root "tools\eccofood-print-agent"
$outputDir = Join-Path $root "public\downloads"
$output = Join-Path $outputDir "eccofood-print-agent.zip"

if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

if (Test-Path $output) {
  Remove-Item -LiteralPath $output -Force
}

Compress-Archive -Path (Join-Path $source "*") -DestinationPath $output -Force
Write-Host "Paquete creado: $output"
