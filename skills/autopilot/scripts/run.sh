#!/usr/bin/env bash
#
# Runs the autopilot loop. One checkpoint per iteration, fresh context each time.
#
#   bash autopilot/run.sh --iterations 10
#   bash autopilot/run.sh --dry-run
#
# Stops early when the agent writes autopilot/HALT. Delete that file to resume.
#
# Exits 0 when the run completed its iterations, 1 when it stopped early or refused to start.

set -euo pipefail

iterations=10
dry_run=0
status=0

while [ $# -gt 0 ]; do
  case "$1" in
    -n|--iterations) iterations="$2"; shift 2 ;;
    --dry-run)       dry_run=1; shift ;;
    -h|--help)       sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)               echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$here")"
halt="$here/HALT"
prompt="$here/PROMPT.md"
config="$here/config"

[ -f "$prompt" ] || { echo "No PROMPT.md at $prompt" >&2; exit 1; }
[ -f "$config" ] || { echo "No config at $config" >&2; exit 1; }

# key=value, ignoring comments and blank lines. Values may contain '=' and spaces.
cfg() {
  local key="$1" value
  value="$(sed -n "s/^[[:space:]]*${key}[[:space:]]*=//p" "$config" | head -n 1)"
  printf '%s' "${value# }"
}

want_branch="$(cfg branch)"
trees_raw="$(cfg trees)"
agent_cmd="$(cfg agent)"

[ -n "$want_branch" ] || { echo "config has no branch=" >&2; exit 1; }
[ -n "$agent_cmd" ]   || { echo "config has no agent=" >&2; exit 1; }

cd "$root"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "$want_branch" ]; then
  echo "On branch '$branch'. The loop only runs on $want_branch." >&2
  exit 1
fi

if [ -f "$halt" ]; then
  echo "HALT is present. Read it, clear the blocker, then delete it."
  cat "$halt"
  exit 1
fi

# Every tree any gate does work in. A check that reads only this repository sees a clean tree
# while a sibling holds uncommitted work, so the driver continues, the next iteration reads a
# clean `git status` and starts something new, and a later `git checkout --` on a failed gate
# discards what was stranded.
trees=()
IFS=',' read -ra parts <<< "${trees_raw:-.}"
for part in "${parts[@]}"; do
  part="$(printf '%s' "$part" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [ -n "$part" ] || continue
  [ -d "$part" ] || { echo "config names a tree that does not exist: $part" >&2; exit 1; }
  trees+=("$(cd "$part" && pwd)")
done

# The baseline is what makes this usable rather than a permanent halt. `--porcelain` lists
# untracked files too, and most repository roots hold untracked files that predate any run.
# Comparing against a snapshot taken now means those are ignored, while a file the iteration
# itself leaves behind still stops the loop. That matters most for untracked ones: `git diff`
# cannot see a new module, so it would otherwise fall out of a commit unnoticed.
# Indexed arrays rather than an associative one, so this runs on the bash 3.2 that ships
# with macOS.
baseline=()
for tree in "${trees[@]}"; do
  baseline+=("$(git -C "$tree" status --porcelain)")
done

for ((i = 1; i <= iterations; i++)); do
  printf '\n=== iteration %d of %d ===\n' "$i" "$iterations"

  if [ "$dry_run" -eq 1 ]; then
    echo "(dry run) would run: $agent_cmd"
  else
    # A fresh process per iteration is the point. Nothing carries over but the files.
    eval "$agent_cmd" < "$prompt"
  fi

  if [ -f "$halt" ]; then
    printf '\nHalted after iteration %d\n' "$i"
    cat "$halt"
    status=1
    break
  fi

  # Anything left uncommitted means the iteration did not finish its own commit.
  stopped=0
  for ((t = 0; t < ${#trees[@]}; t++)); do
    tree="${trees[$t]}"
    now="$(git -C "$tree" status --porcelain)"
    if [ "$now" != "${baseline[$t]}" ]; then
      printf '\n%s changed and was not committed in iteration %d. Stopping.\n' "$tree" "$i" >&2
      git -C "$tree" status --short
      stopped=1
    fi
  done
  if [ "$stopped" -ne 0 ]; then
    status=1
    break
  fi
done

printf '\n--- journal tail ---\n'
tail -n 30 "$here/JOURNAL.md"

exit "$status"
