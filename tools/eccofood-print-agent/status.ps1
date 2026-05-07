try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:17777/health" -TimeoutSec 2
  Write-Host "Activo"
  Write-Host "Impresora predeterminada: $($health.defaultPrinter)"
} catch {
  Write-Host "No responde en http://127.0.0.1:17777"
}
