param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("production-readonly", "staging")]
  [string]$ExpectedEnvironment,

  [Parameter(Mandatory = $true)]
  [ValidateSet("read", "write")]
  [string]$Operation
)

$ErrorActionPreference = "Stop"

$productionRef = "higdnodnztismxmusejz"
$stagingRef = "zhnbrpcekmxldxlqrbhr"
$projectRefPath = Join-Path $PSScriptRoot "..\supabase\.temp\project-ref"

if (-not (Test-Path -LiteralPath $projectRefPath)) {
  throw "No Supabase project is linked. Run supabase link with the expected Project Ref first."
}

$linkedRef = (Get-Content -LiteralPath $projectRefPath -Raw).Trim()
$expectedRef = if ($ExpectedEnvironment -eq "staging") { $stagingRef } else { $productionRef }
$displayEnvironment = if ($ExpectedEnvironment -eq "staging") {
  "STAGING"
} else {
  "PRODUCTION READ-ONLY"
}

Write-Host "TARGET ENVIRONMENT: $displayEnvironment"
Write-Host "PROJECT REF: $linkedRef"
Write-Host "REQUESTED OPERATION: $($Operation.ToUpperInvariant())"

if ($linkedRef -ne $expectedRef) {
  throw "Linked Project Ref does not match the expected environment."
}

if ($linkedRef -eq $productionRef -and $Operation -eq "write") {
  throw "BLOCKED: write operations are never allowed against production."
}

Write-Host "Environment guard passed."
