# Runs the autopilot loop. One checkpoint per iteration, fresh context each time.
#
#   pwsh -File autopilot\run.ps1 -Iterations 10
#   pwsh -File autopilot\run.ps1 -DryRun
#
# Stops early when the agent writes autopilot\HALT. Delete that file to resume.
#
# Exits 0 when the run completed its iterations, 1 when it stopped early or refused to start.

param(
    [int]$Iterations = 10,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Status = 0

$Root = Split-Path -Parent $PSScriptRoot
$Halt = Join-Path $PSScriptRoot 'HALT'
$Prompt = Join-Path $PSScriptRoot 'PROMPT.md'
$Config = Join-Path $PSScriptRoot 'config'

if (-not (Test-Path $Prompt)) { throw "No PROMPT.md at $Prompt" }
if (-not (Test-Path $Config)) { throw "No config at $Config" }

# key=value, ignoring comments and blank lines. Values may contain '=' and spaces.
$Settings = @{}
foreach ($line in Get-Content $Config) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
        $Settings[$Matches[1]] = $Matches[2].Trim()
    }
}

$WantBranch = $Settings['branch']
$AgentCmd = $Settings['agent']
if (-not $WantBranch) { throw 'config has no branch=' }
if (-not $AgentCmd) { throw 'config has no agent=' }

Set-Location $Root

$branch = (git rev-parse --abbrev-ref HEAD)
if ($branch -ne $WantBranch) {
    throw "On branch '$branch'. The loop only runs on $WantBranch."
}

if (Test-Path $Halt) {
    Write-Host "HALT is present. Read it, clear the blocker, then delete it." -ForegroundColor Yellow
    Get-Content $Halt
    exit 1
}

# Every tree any gate does work in. A check that reads only this repository sees a clean tree
# while a sibling holds uncommitted work, so the driver continues, the next iteration reads a
# clean `git status` and starts something new, and a later `git checkout --` on a failed gate
# discards what was stranded.
$Trees = @()
$TreeList = if ($Settings['trees']) { $Settings['trees'] } else { '.' }
foreach ($part in $TreeList.Split(',')) {
    $part = $part.Trim()
    if (-not $part) { continue }
    $full = Join-Path $Root $part
    if (-not (Test-Path $full)) { throw "config names a tree that does not exist: $part" }
    $Trees += (Resolve-Path $full).Path
}

# The baseline is what makes this usable rather than a permanent halt. `--porcelain` lists
# untracked files too, and most repository roots hold untracked files that predate any run.
# Comparing against a snapshot taken now means those are ignored, while a file the iteration
# itself leaves behind still stops the loop. That matters most for untracked ones: `git diff`
# cannot see a new module, so it would otherwise fall out of a commit unnoticed.
$Baseline = @{}
foreach ($tree in $Trees) { $Baseline[$tree] = @(git -C $tree status --porcelain) -join "`n" }

# The prompt reaches the agent on stdin, redirected from the file rather than piped, so the
# agent command in `config` stays a plain command line. Arguments are split on whitespace, so
# keep that line free of quoted arguments containing spaces.
$AgentExe, $AgentArgs = $AgentCmd -split '\s+'

for ($i = 1; $i -le $Iterations; $i++) {
    Write-Host "`n=== iteration $i of $Iterations ===" -ForegroundColor Cyan

    if ($DryRun) {
        Write-Host "(dry run) would run: $AgentCmd"
    } else {
        # A fresh process per iteration is the point. Nothing carries over but the files.
        $run = @{
            FilePath               = $AgentExe
            RedirectStandardInput  = $Prompt
            NoNewWindow            = $true
            Wait                   = $true
        }
        if ($AgentArgs) { $run['ArgumentList'] = $AgentArgs }
        Start-Process @run
    }

    if (Test-Path $Halt) {
        Write-Host "`nHalted after iteration $i" -ForegroundColor Yellow
        Get-Content $Halt
        $Status = 1
        break
    }

    # Anything left uncommitted means the iteration did not finish its own commit.
    $stopped = $false
    foreach ($tree in $Trees) {
        $now = @(git -C $tree status --porcelain) -join "`n"
        if ($now -ne $Baseline[$tree]) {
            Write-Host "`n$tree changed and was not committed in iteration $i. Stopping." -ForegroundColor Red
            git -C $tree status --short
            $stopped = $true
        }
    }
    if ($stopped) { $Status = 1; break }
}

Write-Host "`n--- journal tail ---" -ForegroundColor DarkGray
Get-Content (Join-Path $PSScriptRoot 'JOURNAL.md') -Tail 30

exit $Status
