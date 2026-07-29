#!/usr/bin/env bash
#
# Install Artur's Claude Code skills into ~/.claude/skills
#
#   curl -fsSL https://raw.githubusercontent.com/arturlimaaa/skills/main/install.sh | bash
#
# Options (env vars, since stdin is the script when piped from curl):
#   SKILLS_DIR=/path      install somewhere other than ~/.claude/skills
#   SKILLS_REF=some-tag   install a branch/tag other than main
#   ONLY="tdd qa"         install only the named skills
#   DRY_RUN=1             print what would happen, change nothing
#   NO_BACKUP=1           overwrite existing skills without backing them up
#
# To pass positional skill names instead, download first:
#   curl -fsSLO https://raw.githubusercontent.com/arturlimaaa/skills/main/install.sh
#   bash install.sh tdd qa
#
set -euo pipefail

REPO="${SKILLS_REPO:-arturlimaaa/skills}"
REF="${SKILLS_REF:-main}"
DEST="${SKILLS_DIR:-$HOME/.claude/skills}"
DRY_RUN="${DRY_RUN:-}"
NO_BACKUP="${NO_BACKUP:-}"

# Skill names may come from argv or from $ONLY.
ONLY_LIST=("$@")
if [ ${#ONLY_LIST[@]} -eq 0 ] && [ -n "${ONLY:-}" ]; then
  # shellcheck disable=SC2206
  ONLY_LIST=($ONLY)
fi

BOLD=''; DIM=''; RED=''; GREEN=''; YELLOW=''; RESET=''
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'
  GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
fi

say()  { printf '%s\n' "$*"; }
info() { printf '%s\n' "${DIM}$*${RESET}"; }
warn() { printf '%s\n' "${YELLOW}warning:${RESET} $*" >&2; }
die()  { printf '%s\n' "${RED}error:${RESET} $*" >&2; exit 1; }

command -v tar >/dev/null 2>&1 || die "tar is required but not installed."

TMP="$(mktemp -d "${TMPDIR:-/tmp}/artur-skills.XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

say ""
say "${BOLD}Installing skills from ${REPO}@${REF}${RESET}"
say ""

# ---------------------------------------------------------------- fetch ----
SRC="$TMP/src"
mkdir -p "$SRC"

if command -v git >/dev/null 2>&1; then
  info "Fetching via git…"
  git clone --quiet --depth 1 --branch "$REF" \
    "https://github.com/${REPO}.git" "$SRC" 2>/dev/null \
    || die "Could not clone https://github.com/${REPO}.git (ref: ${REF})."
elif command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1; then
  info "Fetching tarball…"
  URL="https://codeload.github.com/${REPO}/tar.gz/refs/heads/${REF}"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$URL" -o "$TMP/src.tgz" || die "Download failed: $URL"
  else
    wget -qO "$TMP/src.tgz" "$URL" || die "Download failed: $URL"
  fi
  tar -xzf "$TMP/src.tgz" -C "$TMP"
  EXTRACTED="$(find "$TMP" -maxdepth 1 -type d -name '*-*' ! -name src | head -1)"
  [ -n "$EXTRACTED" ] || die "Unexpected tarball layout."
  rmdir "$SRC"; mv "$EXTRACTED" "$SRC"
else
  die "Need git, curl, or wget to download the skills."
fi

[ -d "$SRC/skills" ] || die "No skills/ directory in ${REPO}@${REF}."

# -------------------------------------------------------------- select ----
AVAILABLE=()
for d in "$SRC"/skills/*/; do
  [ -f "${d}SKILL.md" ] || continue
  AVAILABLE+=("$(basename "$d")")
done
[ ${#AVAILABLE[@]} -gt 0 ] || die "No valid skills found (each needs a SKILL.md)."

SELECTED=()
if [ ${#ONLY_LIST[@]} -gt 0 ]; then
  for want in "${ONLY_LIST[@]}"; do
    found=''
    for have in "${AVAILABLE[@]}"; do
      [ "$want" = "$have" ] && { found=1; SELECTED+=("$want"); break; }
    done
    [ -n "$found" ] || warn "No such skill: ${want} (skipping)"
  done
  [ ${#SELECTED[@]} -gt 0 ] || die "None of the requested skills exist."
else
  SELECTED=("${AVAILABLE[@]}")
fi

# ------------------------------------------------------------- install ----
[ -n "$DRY_RUN" ] || mkdir -p "$DEST"

STAMP="$(date +%Y%m%d-%H%M%S)"
n_new=0; n_upd=0; n_same=0

for name in "${SELECTED[@]}"; do
  from="$SRC/skills/$name"
  to="$DEST/$name"

  if [ -L "$to" ]; then
    warn "${name} is a symlink in ${DEST} — leaving it alone."
    continue
  fi

  status="install"; note=""
  if [ -d "$to" ]; then
    if diff -rq "$from" "$to" >/dev/null 2>&1; then
      status="same"
    else
      status="update"
      if [ -z "$NO_BACKUP" ]; then
        note=" ${DIM}(backed up to ${name}.bak-${STAMP})${RESET}"
      else
        note=" ${DIM}(overwritten)${RESET}"
      fi
    fi
  fi

  case "$status" in
    same)   printf '  %s─%s %-32s %sunchanged%s\n' "$DIM" "$RESET" "$name" "$DIM" "$RESET"; n_same=$((n_same+1)) ;;
    update) printf '  %s↻%s %-32s updated%s\n'     "$YELLOW" "$RESET" "$name" "$note";     n_upd=$((n_upd+1)) ;;
    *)      printf '  %s+%s %-32s installed\n'     "$GREEN" "$RESET" "$name";              n_new=$((n_new+1)) ;;
  esac

  [ -n "$DRY_RUN" ] && continue
  [ "$status" = "same" ] && continue

  if [ "$status" = "update" ] && [ -z "$NO_BACKUP" ]; then
    mv "$to" "${to}.bak-${STAMP}"
  fi
  rm -rf "$to"
  cp -R "$from" "$to"
done

say ""
if [ -n "$DRY_RUN" ]; then
  say "${BOLD}Dry run${RESET} — nothing was written."
else
  say "${BOLD}Done.${RESET} ${n_new} installed, ${n_upd} updated, ${n_same} unchanged → ${DEST}"
fi
say ""
say "Restart Claude Code, then type ${BOLD}/${RESET} to see the skills."
say ""
