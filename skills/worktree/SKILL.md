---
name: worktree
description: Create, set up, list, or remove a git worktree so a new line of work gets its own directory instead of switching branches. Use when starting work that would otherwise require `git checkout`/`git switch`, when the checkout has uncommitted changes, when asked to work on several branches at once, or when asked to clean up worktrees.
---

# Worktree-driven development

One directory per line of work. The point is that nothing has to move: no
stashing, no switching under uncommitted changes, no stranded work.

## Create

```
git worktree add ../<repo>-<topic> -b <branch>        # new branch
git worktree add ../<repo>-<topic> <existing-branch>  # existing branch
```

Name the directory for the work, not the branch — `../myapp-auth` reads better
in a shell prompt than a slashed branch name. Put it beside the
repo, never inside it (a worktree inside the repo becomes an untracked
directory git has to ignore).

A branch can only be checked out in one worktree at a time. `git worktree add`
fails loudly if it is already live somewhere — check `git worktree list` rather
than fighting the error.

## Set up — the part that is easy to forget

**Only tracked files come across.** Everything gitignored is absent: virtualenvs,
local env files that are not tracked, editor state, `.claude/`, scratch dirs.
A worktree that looks complete can be missing exactly what makes commands run.

Work out what this project needs, in this order:

1. **Dependencies.** Whatever creates the environment — for a `uv` project,
   `uv sync --all-packages --all-groups --frozen`; otherwise the project's
   documented install step. Without it every runner call fails.
2. **Untracked config.** Check whether env files are tracked
   (`git ls-files --error-unmatch .env.local`) — some repos force-add them, in
   which case nothing is needed. If they are untracked, copy them from the main
   checkout.
3. **`.claude/` — only if the project keeps agent context there.** If the main
   checkout has `.claude/memory/`, `.claude/agents/`, or a `CLAUDE.md` that
   imports from `.claude/`, the worktree cannot see any of it and will fail
   **silently** — a missing import resolves to nothing, so the agent is simply
   amnesiac with no error. Link it (Windows, no admin needed):

   ```
   cmd /c mklink /J .claude <main-checkout>\.claude
   ```

   On macOS/Linux: `ln -s <main-checkout>/.claude .claude`.

Then verify before starting work — run the project's lint or unit tests once. A
worktree that cannot run its own test suite is not set up.

## Ground rules

- **Always the project runner, never a bare binary.** `uv run pytest`, not
  `pytest`. An activated venv exports `VIRTUAL_ENV`, which follows you between
  worktrees; `uv run` catches the mismatch and warns, a bare call silently runs
  the other worktree's code.
- **Know what cannot be parallel.** Fixed host ports and fixed container names
  collide — a second `docker run --name <fixed>` just fails. Database migration
  generation is worse: a shared checksum file and timestamp-ordered filenames
  mean concurrent generation conflicts every time. Keep those on one worktree.
- **Check the project's own notes** (`AGENTS.md`, `CLAUDE.md`, project memory)
  for which commands are parallel-safe before assuming.

## Inspect and clean up

```
git worktree list                    # where they are, and on what branch
git worktree remove <path>           # remove (refuses if dirty)
git worktree remove --force <path>   # remove anyway — check `git -C <path> status` first
git worktree prune                   # drop metadata for manually deleted dirs
```

Removing a worktree does **not** delete its branch; `git branch -d <branch>`
separately once merged. Remove worktrees as their work lands, so the list stays
a true picture of what is in flight.

## When not to use one

A quick read-only look at another branch (`git show <branch>:<file>`,
`git log <branch>`) needs no worktree. Reach for one when you will be *editing*
on a different branch, or running builds and tests that need a real tree.
