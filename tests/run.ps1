<#
.SYNOPSIS Plugin self-tests.
#>
$ErrorActionPreference = 'Stop'

$root = Resolve-Path "$PSScriptRoot/.."
Push-Location $root
try {
  $failures = @()

  function Test-Step($name, [scriptblock]$body) {
    Write-Host "▶ $name" -ForegroundColor Cyan
    try { & $body; Write-Host "  ✓ $name" -ForegroundColor Green }
    catch {
      Write-Host "  ✗ $name : $_" -ForegroundColor Red
      $script:failures += $name
    }
  }

  Test-Step 'plugin manifest valid' {
    $m = Get-Content '.claude-plugin/plugin.json' -Raw | ConvertFrom-Json
    if (-not $m.name) { throw 'plugin.json missing name' }
  }

  Test-Step 'knowledge lint passes' {
    & node tests/lint-knowledge.mjs
    if ($LASTEXITCODE -ne 0) { throw "lint exit $LASTEXITCODE" }
  }

  Test-Step 'lint-knowledge unit tests pass' {
    & node --test tests/lint-knowledge.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "test exit $LASTEXITCODE" }
  }

  Test-Step 'playwright-shoot unit tests pass' {
    & node --test scripts/playwright-shoot.test.mjs
    if ($LASTEXITCODE -ne 0) { throw "test exit $LASTEXITCODE" }
  }

  Test-Step 'fixtures typecheck' {
    foreach ($f in @('trading-bare','saas-bare','ecom-bare')) {
      Push-Location "tests/fixtures/$f"
      try {
        if (-not (Test-Path 'node_modules')) { & npm install --silent }
        & npm run typecheck --silent
        if ($LASTEXITCODE -ne 0) { throw "$f typecheck failed" }
      } finally { Pop-Location }
    }
  }

  Test-Step 'stack-guard fixture parses as non-React/Next+Tailwind' {
    $pkg = Get-Content 'tests/fixtures/mixed-stack/package.json' -Raw | ConvertFrom-Json
    if ($pkg.dependencies.next) { throw 'mixed-stack should not declare next' }
    if (-not $pkg.dependencies.'styled-components') { throw 'mixed-stack should declare styled-components' }
  }

  Test-Step 'dirty-tree fixture exists' {
    if (-not (Test-Path 'tests/fixtures/dirty-tree/package.json')) {
      throw 'dirty-tree fixture missing'
    }
  }

  if ($failures.Count -gt 0) {
    Write-Host "`n$($failures.Count) failure(s):" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  - $_" }
    exit 1
  } else {
    Write-Host "`nAll tests passed." -ForegroundColor Green
  }
} finally { Pop-Location }
