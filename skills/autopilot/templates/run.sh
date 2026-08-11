#!/usr/bin/env bash
#
# The UNATTENDED variant. The procedure this skill teaches is supervised: an agent implements,
# a person runs the gates and commits. Use this only once the gates are trusted and nothing on
# the path spends money or touches production. See "What this does NOT do" in SKILL.md.
#
# Runs the autopilot loop. One checkpoint per iteration, fresh context each time.
#
#   ./autopilot/run.sh my/branch 10
#
# Stops early when an iteration writes autopilot/HALT. Delete that file to resume.
set -euo pipefail

BRANCH="${1:?usage: run.sh <branch> [iterations]}"
ITERATIONS="${2:-10}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HALT="$ROOT/autopilot/HALT"
PROMPT="$ROOT/autopilot/PROMPT.md"

cd "$ROOT"
[ -f "$PROMPT" ] || { echo "No PROMPT.md at $PROMPT" >&2; exit 1; }

current="$(git rev-parse --abbrev-ref HEAD)"
[ "$current" = "$BRANCH" ] || { echo "On branch '$current'. The loop only runs on $BRANCH." >&2; exit 1; }

if [ -f "$HALT" ]; then
  echo "HALT is present. Read it, clear the blocker, then delete it." >&2
  cat "$HALT"
  exit 1
fi

for i in $(seq 1 "$ITERATIONS"); do
  echo
  echo "=== iteration $i of $ITERATIONS ==="

  # A fresh process per iteration is the point. Nothing carries over but the files.
  claude -p --permission-mode acceptEdits < "$PROMPT"

  if [ -f "$HALT" ]; then
    echo; echo "Halted after iteration $i"; cat "$HALT"; break
  fi

  # A dirty tree means the iteration did not finish its own commit.
  if [ -n "$(git status --porcelain)" ]; then
    echo; echo "Working tree is dirty after iteration $i. Stopping." >&2
    git status --porcelain
    break
  fi
done

echo; echo "--- journal tail ---"
tail -n 30 "$ROOT/autopilot/JOURNAL.md"
