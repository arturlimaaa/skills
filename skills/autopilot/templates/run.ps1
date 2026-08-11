# The UNATTENDED variant. The procedure this skill teaches is supervised: an agent implements,
# a person runs the gates and commits. Use this only once the gates are trusted and nothing on
# the path spends money or touches production. See "What this does NOT do" in SKILL.md.
#
# Runs the autopilot loop. One checkpoint per iteration, fresh context each time.
#
#   pwsh -File autopilot\run.ps1 -Iterations 10
#
# Stops early when the agent writes autopilot\HALT. Delete that file to resume.

param(
    [Parameter(Mandatory=$true)][string]$Branch,
    [int]$Iterations = 10,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Halt = Join-Path $PSScriptRoot 'HALT'
$Prompt = Join-Path $PSScriptRoot 'PROMPT.md'

if (-not (Test-Path $Prompt)) { throw "No PROMPT.md at $Prompt" }

Set-Location $Root

$branch = (git rev-parse --abbrev-ref HEAD)
if ($branch -ne $Branch) {
    throw "On branch '$branch'. The loop only runs on $Branch."
}

if (Test-Path $Halt) {
    Write-Host "HALT is present. Read it, clear the blocker, then delete it." -ForegroundColor Yellow
    Get-Content $Halt
    exit 1
}

$body = Get-Content $Prompt -Raw

for ($i = 1; $i -le $Iterations; $i++) {
    Write-Host "`n=== iteration $i of $Iterations ===" -ForegroundColor Cyan

    if ($DryRun) {
        Write-Host "(dry run) would invoke the agent here"
    } else {
        # A fresh process per iteration is the point. Nothing carries over but the files.
        $body | claude -p --permission-mode acceptEdits
    }

    if (Test-Path $Halt) {
        Write-Host "`nHalted after iteration $i" -ForegroundColor Yellow
        Get-Content $Halt
        break
    }

    # A dirty tree means the iteration did not finish its own commit.
    $dirty = git status --porcelain
    if ($dirty) {
        Write-Host "`nWorking tree is dirty after iteration $i. Stopping." -ForegroundColor Red
        $dirty
        break
    }
}

Write-Host "`n--- journal tail ---" -ForegroundColor DarkGray
Get-Content (Join-Path $PSScriptRoot 'JOURNAL.md') -Tail 30
