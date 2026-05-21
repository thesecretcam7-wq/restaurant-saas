param(
  [int]$Port = 17777
)

$ErrorActionPreference = "Stop"

$AgentVersion = "1.1.0"
$PrinterCacheTtlSeconds = 30
$script:DefaultPrinterCache = $null
$script:DefaultPrinterCacheAt = [datetime]::MinValue
$script:PrinterListCache = $null
$script:PrinterListCacheAt = [datetime]::MinValue
$script:StartedAt = Get-Date

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA
  {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, Int32 dwCount, out Int32 dwWritten);

  public static bool SendBytesToPrinter(string printerName, byte[] bytes)
  {
    IntPtr hPrinter;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Eccofood Ticket";
    di.pDataType = "RAW";

    if (!OpenPrinter(printerName.Normalize(), out hPrinter, IntPtr.Zero)) return false;

    bool ok = false;
    try
    {
      if (StartDocPrinter(hPrinter, 1, di))
      {
        if (StartPagePrinter(hPrinter))
        {
          Int32 written;
          ok = WritePrinter(hPrinter, bytes, bytes.Length, out written) && written == bytes.Length;
          EndPagePrinter(hPrinter);
        }
        EndDocPrinter(hPrinter);
      }
    }
    finally
    {
      ClosePrinter(hPrinter);
    }
    return ok;
  }
}
"@

function Write-AgentLog {
  param([string]$Message)
  $dir = Join-Path $env:ProgramData "EccofoodPrint"
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Add-Content -Path (Join-Path $dir "agent.log") -Value "[$(Get-Date -Format s)] $Message"
}

function Send-Json {
  param($Context, [int]$StatusCode, $Payload)
  $json = $Payload | ConvertTo-Json -Depth 10
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.Headers.Add("Access-Control-Allow-Origin", "*")
  $Context.Response.Headers.Add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  $Context.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
  $Context.Response.Headers.Add("Access-Control-Allow-Private-Network", "true")
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}

function Get-DefaultPrinterName {
  param([switch]$Refresh)

  $cacheAge = ((Get-Date) - $script:DefaultPrinterCacheAt).TotalSeconds
  if (-not $Refresh -and $script:DefaultPrinterCache -and $cacheAge -lt $PrinterCacheTtlSeconds) {
    return $script:DefaultPrinterCache
  }

  try {
    $printer = Get-CimInstance -Query "SELECT Name FROM Win32_Printer WHERE Default = True" | Select-Object -First 1
    $script:DefaultPrinterCache = if ($printer) { $printer.Name } else { $null }
    $script:DefaultPrinterCacheAt = Get-Date
    return $script:DefaultPrinterCache
  } catch {
    Write-AgentLog "No se pudo leer impresora predeterminada: $($_.Exception.Message)"
    return $script:DefaultPrinterCache
  }
}

function Get-PrinterList {
  param([switch]$Refresh)

  $cacheAge = ((Get-Date) - $script:PrinterListCacheAt).TotalSeconds
  if (-not $Refresh -and $script:PrinterListCache -and $cacheAge -lt $PrinterCacheTtlSeconds) {
    return $script:PrinterListCache
  }

  try {
    $script:PrinterListCache = @(Get-CimInstance Win32_Printer | Select-Object Name, Default, WorkOffline, PrinterStatus)
    $script:PrinterListCacheAt = Get-Date
    $default = $script:PrinterListCache | Where-Object { $_.Default -eq $true } | Select-Object -First 1
    if ($default) {
      $script:DefaultPrinterCache = $default.Name
      $script:DefaultPrinterCacheAt = Get-Date
    }
    return $script:PrinterListCache
  } catch {
    Write-AgentLog "No se pudo leer lista de impresoras: $($_.Exception.Message)"
    return @()
  }
}

function Resolve-PrinterName {
  param([string]$PrinterName)
  if ([string]::IsNullOrWhiteSpace($PrinterName) -or $PrinterName -eq "default") {
    return Get-DefaultPrinterName
  }
  return $PrinterName
}

$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-AgentLog "Eccofood Print Agent iniciado en $prefix"
Write-Host "Eccofood Print Agent activo en $prefix"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $path = $context.Request.Url.AbsolutePath.ToLowerInvariant()

    if ($context.Request.HttpMethod -eq "OPTIONS") {
      Send-Json $context 200 @{ ok = $true }
      continue
    }

    if ($path -eq "/health") {
      Send-Json $context 200 @{
        ok = $true
        app = "Eccofood Print Agent"
        version = $AgentVersion
        defaultPrinter = Get-DefaultPrinterName
        pid = $PID
        uptimeSeconds = [int]((Get-Date) - $script:StartedAt).TotalSeconds
      }
      continue
    }

    if ($path -eq "/printers") {
      Send-Json $context 200 @{
        ok = $true
        defaultPrinter = Get-DefaultPrinterName -Refresh
        printers = Get-PrinterList -Refresh
      }
      continue
    }

    if ($path -ne "/print" -or $context.Request.HttpMethod -ne "POST") {
      Send-Json $context 404 @{ ok = $false; error = "Ruta no encontrada" }
      continue
    }

    $reader = [System.IO.StreamReader]::new($context.Request.InputStream, [System.Text.Encoding]::UTF8)
    $body = $reader.ReadToEnd()
    $payload = $body | ConvertFrom-Json

    $printerName = Resolve-PrinterName ([string]$payload.printerName)
    if ([string]::IsNullOrWhiteSpace($printerName)) {
      Send-Json $context 400 @{ ok = $false; error = "No hay impresora predeterminada en Windows" }
      continue
    }

    $bytes = [Convert]::FromBase64String([string]$payload.dataBase64)
    $ok = [RawPrinterHelper]::SendBytesToPrinter($printerName, $bytes)

    if ($ok) {
      Write-AgentLog "Impresion enviada a $printerName ($($bytes.Length) bytes)"
      Send-Json $context 200 @{ ok = $true; printerName = $printerName }
    } else {
      Write-AgentLog "Windows rechazo impresion en $printerName"
      Send-Json $context 500 @{ ok = $false; error = "Windows no acepto el trabajo de impresion"; printerName = $printerName }
    }
  } catch {
    Write-AgentLog "Error: $($_.Exception.Message)"
    Send-Json $context 500 @{ ok = $false; error = $_.Exception.Message }
  }
}
