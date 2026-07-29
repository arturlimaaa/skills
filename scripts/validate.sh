#!/usr/bin/env bash
#
# Sanity-check the skills in this repo before publishing.
#
#   ./scripts/validate.sh
#
# Catches the things that silently break installs on someone else's machine:
#   - symlinks, which Windows checkouts and GitHub's zip both mangle
#   - a missing SKILL.md
#   - frontmatter whose `name:` disagrees with the directory
#   - stray junk (.DS_Store, __pycache__) that shouldn't ship
#
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '  %-34s %s\n' "$1" "$2"; }

echo
echo "Validating skills/…"
echo

# --- symlinks ---------------------------------------------------------------
while IFS= read -r link; do
  [ -n "$link" ] || continue
  note "$link" "symlink — breaks on Windows and in zip installs"
  fail=1
done < <(find skills -type l 2>/dev/null)

# --- junk -------------------------------------------------------------------
while IFS= read -r junk; do
  [ -n "$junk" ] || continue
  note "$junk" "should not be committed"
  fail=1
done < <(find skills \( -name '.DS_Store' -o -name '__pycache__' -o -name '*.pyc' \) 2>/dev/null)

# --- per-skill --------------------------------------------------------------
count=0
for dir in skills/*/; do
  name="$(basename "${dir%/}")"

  if [ ! -f "${dir}SKILL.md" ]; then
    note "$name" "no SKILL.md"
    fail=1
    continue
  fi

  # Pull `name:` out of the YAML frontmatter without needing a YAML parser.
  declared="$(awk '
    NR==1 && $0=="---" { inside=1; next }
    inside && $0=="---" { exit }
    inside && /^name:[[:space:]]*/ {
      sub(/^name:[[:space:]]*/, "")
      gsub(/^["'"'"']|["'"'"']$/, "")
      print; exit
    }
  ' "${dir}SKILL.md")"

  if [ -z "$declared" ]; then
    note "$name" "frontmatter has no name:"
    fail=1
  elif [ "$declared" != "$name" ]; then
    note "$name" "frontmatter says name: $declared"
    fail=1
  fi

  count=$((count + 1))
done

echo
if [ "$fail" -eq 0 ]; then
  echo "OK — $count skills, nothing to fix."
else
  echo "Problems found. See above."
fi
echo
exit "$fail"
