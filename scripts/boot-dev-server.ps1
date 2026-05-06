<#
.SYNOPSIS
  Boot a project's dev server and return its URL.
.PARAMETER ProjectRoot
  Project directory (must contain package.json with a `dev` script).
.PARAMETER PortHint
  Preferred port to probe first (default 3000).
.PARAMETER TimeoutSec
  How long to wait for the server to respond (default 60).
.OUTPUTS
  On success: writes URL on stdout (e.g. http://localhost:3000) and the PID
  on the second line.
  On failure: exits non-zero with stderr describing the cause.
#>
param(
  [Parameter(Mandatory)] [string] $ProjectRoot,
  [int] $PortHint = 3000,
  [int] $TimeoutSec = 60
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) {
  Write-Error "No package.json in $ProjectRoot"
  exit 2
}

$pkg = Get-Content (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json
if (-not $pkg.scripts.dev) {
  Write-Error "package.json has no 'dev' script"
  exit 3
}

$pkgManager = 'npm'
if (Test-Path (Join-Path $ProjectRoot 'pnpm-lock.yaml')) { $pkgManager = 'pnpm' }
elseif (Test-Path (Join-Path $ProjectRoot 'yarn.lock')) { $pkgManager = 'yarn' }

$logFile = Join-Path $ProjectRoot '.ui-master/dev-server.log'
New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null

$proc = Start-Process -FilePath $pkgManager `
  -ArgumentList 'run','dev' `
  -WorkingDirectory $ProjectRoot `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError "$logFile.err" `
  -PassThru -WindowStyle Hidden

$candidatePorts = @($PortHint, 3000, 3001, 5173, 4173, 8080) | Select-Object -Unique
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$resolvedUrl = $null

while ((Get-Date) -lt $deadline -and -not $resolvedUrl) {
  foreach ($port in $candidatePorts) {
    $url = "http://localhost:$port"
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($r.StatusCode -lt 500) { $resolvedUrl = $url; break }
    } catch { }
  }
  if (-not $resolvedUrl) { Start-Sleep -Milliseconds 500 }
}

if (-not $resolvedUrl) {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  $tail = Get-Content $logFile -Tail 30 -ErrorAction SilentlyContinue
  Write-Error "Dev server did not respond within $TimeoutSec s. Tail of log:`n$($tail -join "`n")"
  exit 4
}

Write-Output $resolvedUrl
Write-Output $proc.Id
