<#
.SYNOPSIS
  Install Artur's Claude Code skills into $HOME\.claude\skills

.EXAMPLE
  irm https://raw.githubusercontent.com/arturlimaaa/skills/main/install.ps1 | iex

.DESCRIPTION
  When piped to iex you cannot pass parameters, so options are read from
  environment variables:

    $env:SKILLS_DIR = 'C:\path'     install somewhere other than ~\.claude\skills
    $env:SKILLS_REF = 'some-tag'    install a branch/tag other than main
    $env:ONLY       = 'tdd qa'      install only the named skills
    $env:DRY_RUN    = '1'           print what would happen, change nothing
    $env:NO_BACKUP  = '1'           overwrite existing skills without backing up

  To use real parameters, download the script first:

    irm https://raw.githubusercontent.com/arturlimaaa/skills/main/install.ps1 -OutFile install.ps1
    .\install.ps1 -Only tdd,qa
#>
[CmdletBinding()]
param(
  [string[]] $Only,
  [string]   $Ref     = $(if ($env:SKILLS_REF) { $env:SKILLS_REF } else { 'main' }),
  [string]   $Dest    = $(if ($env:SKILLS_DIR) { $env:SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }),
  [string]   $Repo    = $(if ($env:SKILLS_REPO) { $env:SKILLS_REPO } else { 'arturlimaaa/skills' }),
  [switch]   $DryRun,
  [switch]   $NoBackup
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'   # Invoke-WebRequest is glacial with the progress bar on 5.1

# Windows PowerShell 5.1 may still default to TLS 1.0, which github.com refuses.
try {
  [Net.ServicePointManager]::SecurityProtocol =
    [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

# Env-var fallbacks, for the `irm | iex` path where params can't be bound.
if (-not $Only     -and $env:ONLY)      { $Only     = $env:ONLY -split '[,\s]+' | Where-Object { $_ } }
if (-not $DryRun   -and $env:DRY_RUN)   { $DryRun   = $true }
if (-not $NoBackup -and $env:NO_BACKUP) { $NoBackup = $true }

function Write-Info { param($m) Write-Host $m -ForegroundColor DarkGray }
function Write-Warn { param($m) Write-Host "warning: $m" -ForegroundColor Yellow }
function Stop-With  { param($m) Write-Host "error: $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Installing skills from $Repo@$Ref" -ForegroundColor White
Write-Host ""

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("artur-skills-" + [System.Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

try {
  # ------------------------------------------------------------- fetch ----
  $src = Join-Path $tmp 'src'

  if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Info "Fetching via git..."
    # git writes progress to stderr; under $ErrorActionPreference='Stop' that would
    # surface as a NativeCommandError on 5.1, so relax it just for this call.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    git clone --quiet --depth 1 --branch $Ref "https://github.com/$Repo.git" $src 2>&1 | Out-Null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { Stop-With "Could not clone https://github.com/$Repo.git (ref: $Ref)." }
  }
  else {
    Write-Info "Fetching zip..."
    $zip = Join-Path $tmp 'src.zip'
    $url = "https://codeload.github.com/$Repo/zip/refs/heads/$Ref"
    try {
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    } catch {
      Stop-With "Download failed: $url"
    }
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $extracted = Get-ChildItem -Path $tmp -Directory | Where-Object { $_.Name -ne 'src' } | Select-Object -First 1
    if (-not $extracted) { Stop-With "Unexpected zip layout." }
    Rename-Item -Path $extracted.FullName -NewName 'src'
  }

  $skillsRoot = Join-Path $src 'skills'
  if (-not (Test-Path $skillsRoot)) { Stop-With "No skills/ directory in $Repo@$Ref." }

  # ------------------------------------------------------------ select ----
  $available = Get-ChildItem -Path $skillsRoot -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') }

  if ($available.Count -eq 0) { Stop-With "No valid skills found (each needs a SKILL.md)." }

  if ($Only) {
    $selected = @()
    foreach ($want in $Only) {
      $match = $available | Where-Object { $_.Name -eq $want }
      if ($match) { $selected += $match } else { Write-Warn "No such skill: $want (skipping)" }
    }
    if ($selected.Count -eq 0) { Stop-With "None of the requested skills exist." }
  }
  else {
    $selected = $available
  }

  # ----------------------------------------------------------- install ----
  if (-not $DryRun) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }

  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $nNew = 0; $nUpd = 0; $nSame = 0

  foreach ($skill in $selected) {
    $name = $skill.Name
    $to   = Join-Path $Dest $name

    $existing = Get-Item -Path $to -ErrorAction SilentlyContinue
    if ($existing -and $existing.LinkType) {
      Write-Warn "$name is a symlink in $Dest - leaving it alone."
      continue
    }

    $status = 'install'
    if (Test-Path $to) {
      $a = Get-ChildItem -Path $skill.FullName -Recurse -File | Sort-Object FullName
      $b = Get-ChildItem -Path $to -Recurse -File | Sort-Object FullName
      $sameContent = $false
      if ($a.Count -eq $b.Count) {
        $ha = ($a | ForEach-Object { (Get-FileHash $_.FullName -Algorithm SHA256).Hash }) -join ''
        $hb = ($b | ForEach-Object { (Get-FileHash $_.FullName -Algorithm SHA256).Hash }) -join ''
        $sameContent = ($ha -eq $hb)
      }
      $status = if ($sameContent) { 'same' } else { 'update' }
    }

    switch ($status) {
      'same' {
        Write-Host ("  - {0,-32} unchanged" -f $name) -ForegroundColor DarkGray
        $nSame++
      }
      'update' {
        $note = if ($NoBackup) { "(overwritten)" } else { "(backed up to $name.bak-$stamp)" }
        Write-Host ("  ~ {0,-32} updated " -f $name) -ForegroundColor Yellow -NoNewline
        Write-Host $note -ForegroundColor DarkGray
        $nUpd++
      }
      default {
        Write-Host ("  + {0,-32} installed" -f $name) -ForegroundColor Green
        $nNew++
      }
    }

    if ($DryRun -or $status -eq 'same') { continue }

    if ($status -eq 'update') {
      if ($NoBackup) { Remove-Item -Path $to -Recurse -Force }
      else { Rename-Item -Path $to -NewName "$name.bak-$stamp" }
    }
    Copy-Item -Path $skill.FullName -Destination $to -Recurse -Force
  }

  Write-Host ""
  if ($DryRun) {
    Write-Host "Dry run - nothing was written." -ForegroundColor White
  }
  else {
    Write-Host "Done. $nNew installed, $nUpd updated, $nSame unchanged -> $Dest" -ForegroundColor White
  }
  Write-Host ""
  Write-Host "Restart Claude Code, then type / to see the skills."
  Write-Host ""
}
finally {
  Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
