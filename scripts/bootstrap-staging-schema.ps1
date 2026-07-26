param(
  [switch]$Apply,

  [ValidateSet(
    "01-types-and-tables",
    "02-constraints",
    "03-functions-defaults-and-indexes",
    "04-triggers-rls-and-policies",
    "05-grants",
    "06-auth-hooks"
  )]
  [string]$StartPhase = "01-types-and-tables"
)

$ErrorActionPreference = "Stop"

if (-not $Apply) {
  throw "Explicit confirmation required. Re-run with -Apply after reviewing the target and baseline."
}

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$baselinePath = Join-Path $repositoryRoot "supabase\baseline\000_public_schema_baseline.sql"
$preflightPath = Join-Path $repositoryRoot "supabase\verification\020_1d_staging_preflight.sql"
$guardPath = Join-Path $PSScriptRoot "assert-supabase-target.ps1"
$temporaryDirectory = Join-Path $repositoryRoot "output\database-baseline\bootstrap-phases"

Write-Host "TARGET ENVIRONMENT: STAGING"
Write-Host "OPERATION: STRUCTURAL BASELINE BOOTSTRAP"

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $guardPath `
  -ExpectedEnvironment staging `
  -Operation write

if ($LASTEXITCODE -ne 0) {
  throw "The staging environment guard did not pass."
}

function Invoke-SupabaseQueryFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $result = & npx.cmd --yes supabase@latest --agent no db query `
    --linked `
    --file $FilePath `
    --output-format json 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference

  if ($exitCode -ne 0) {
    $result | Select-Object -Last 20 | Write-Host
    throw "Supabase query failed for $FilePath"
  }

  return @($result | Where-Object { $_ -notmatch "^Initialising login role" })
}

$preflightResult = Invoke-SupabaseQueryFile -FilePath $preflightPath
$preflightJson = ($preflightResult -join [Environment]::NewLine) | ConvertFrom-Json
$preflight = @($preflightJson)[0].staging_preflight

if ($preflight.auth_users -ne 0) {
  throw "Staging contains Auth users. Bootstrap has been blocked."
}

if ($StartPhase -eq "01-types-and-tables" -and $preflight.public_tables -ne 0) {
  throw "Staging is not empty. Initial bootstrap has been blocked."
}

if ($StartPhase -ne "01-types-and-tables" -and $preflight.public_tables -ne 27) {
  throw "A resumed bootstrap requires exactly the 27 baseline tables."
}

Write-Host "PREFLIGHT: staging has no Auth users and matches the expected resume state."

$baseline = Get-Content -LiteralPath $baselinePath -Raw -Encoding UTF8
$phasePattern = [regex]::new(
  "(?ms)^-- baseline:phase:(?<name>[a-z0-9-]+):start\s*$" +
    "(?<sql>.*?)" +
    "^-- baseline:phase:\k<name>:end\s*$"
)
$phaseMatches = $phasePattern.Matches($baseline)

if ($phaseMatches.Count -eq 0) {
  throw "No executable phases were found in the baseline."
}

New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null

$startPhaseReached = $false

foreach ($phase in $phaseMatches) {
  $phaseName = $phase.Groups["name"].Value

  if ($phaseName -eq $StartPhase) {
    $startPhaseReached = $true
  }

  if (-not $startPhaseReached) {
    continue
  }

  $phaseSql = $phase.Groups["sql"].Value.Trim() + [Environment]::NewLine
  $phasePath = Join-Path $temporaryDirectory "$phaseName.sql"

  [System.IO.File]::WriteAllText(
    $phasePath,
    $phaseSql,
    [System.Text.UTF8Encoding]::new($false)
  )

  Write-Host "APPLYING PHASE: $phaseName"
  Invoke-SupabaseQueryFile -FilePath $phasePath | Out-Null
  Write-Host "PHASE COMPLETE: $phaseName"
}

Write-Host "BASELINE BOOTSTRAP: COMPLETE"
