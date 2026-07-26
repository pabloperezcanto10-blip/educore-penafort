param(
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

if (-not $Apply) {
  throw "Explicit confirmation required. Re-run with -Apply after verifying structural parity."
}

$guardPath = Join-Path $PSScriptRoot "assert-supabase-target.ps1"
$baselineVersions = 1..33 | ForEach-Object { $_.ToString("000") }

Write-Host "TARGET ENVIRONMENT: STAGING"
Write-Host "OPERATION: MIGRATION HISTORY REPAIR"
Write-Host "VERSIONS: 001-033"
Write-Host "034 WILL NOT BE APPLIED OR REPAIRED"

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $guardPath `
  -ExpectedEnvironment staging `
  -Operation write

if ($LASTEXITCODE -ne 0) {
  throw "The staging environment guard did not pass."
}

& npx.cmd --yes supabase@latest --agent no migration repair `
  --linked `
  --status applied `
  @baselineVersions

if ($LASTEXITCODE -ne 0) {
  throw "Staging migration history repair failed."
}

Write-Host "MIGRATION HISTORY REPAIR: COMPLETE"
