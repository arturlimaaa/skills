# Gate hygiene

Every rule here exists because it produced a false result in a real unattended run. A false failure
halts a night for nothing; a false pass is worse, because the journal stays green over a defect.

## 1 · Running a gate

**Capture the exit code immediately, before any pipe.** Never pipe a gate into `grep` and read
`$?`, because the code would be `grep`'s.

**Redirect to a file, then read the file. Do not pipe into `tail` or `head` either.** Those close
stdout as soon as they have their lines. `pytest` then raises `ValueError: I/O operation on closed
file` out of its own logging teardown and exits 1 with every test passed. Measured: the same
command reporting 718 passed and exit 0 when redirected reported exit 1 when piped to `tail -5`.
`${PIPESTATUS[0]}` does not save you, because the failure is real and belongs to pytest.

**Use the project's runner, never a bare tool.** An activated virtualenv exports `VIRTUAL_ENV` and
it follows you into other worktrees, so a bare `pytest` or `mypy` silently runs another worktree's
code and produces a confidently wrong result rather than an error. `uv run`, `poetry run`,
`npm run`, `pnpm exec` — whatever the repo uses, always.

**A gate you did not run is a gate that failed.** There is no reading of the code that substitutes
for an exit code.

**Know what the gate set does not read.** A `scripts/` directory outside pytest `testpaths` and
outside the type checker's `files` is seen by nothing but the linter: a broken import or a new
branch there passes every gate. When a checkpoint changes such a file, run it by hand and record
the exit code.

**Watch for a gate that fails while passing.** A tool printing a spinner or an emoji through a
legacy console codepage dies with `UnicodeEncodeError` after doing its job correctly and reports
non-zero. Set the encoding variable or redirect to a real file, and write the trap into
`GUARDRAILS.md` §4 so the next fresh context does not rediscover it at 3am.

**Chunk anything long into calls that print.** A single tool call producing no output for more than
ten minutes gets killed by a stall watchdog regardless of load. Twelve pytest runs in one `for`
loop print nothing until the loop ends. Run them six at a time in separate calls, printing after
each batch.

## 2 · Mutating a file to test a hypothesis

**No git command may write to a working tree.** Not `checkout`, not `restore`, not `stash`, not
`reset`, not `clean`.

`git checkout -- <file>` does not undo a mutation. It restores the file to `HEAD`, discarding every
uncommitted change in it. This has destroyed finished work in a real run: the file had been
committed one checkpoint earlier so it had a `HEAD` to snap back to, and an entire implementation
vanished in one call. The `13 passed, exit 0` that followed stayed a **true measurement of a tree
that no longer existed**.

The inversion is worth holding on to: an untracked file removes `git checkout`'s recovery path, and
a *tracked* file gives it a destination. So a loop's commit-every-checkpoint discipline — which
exists so work is never stranded — is exactly what arms the deletion.

**The required method.** Copy the file to a scratchpad, mutate in place, copy the backup back,
**verify the restore by hash**, and re-run the suite green before the next mutation. Abort on a
hash mismatch rather than continuing.

**The ban is not on agents. It is on anyone touching a working tree that holds uncommitted work
they did not write.** Read it, copy it aside, and only then change it. And check what a change was
satisfying before removing it: when two rules collide, that is a decision to surface, not one to
settle by deletion.

## 3 · Forbidden actions worth having in almost every `GUARDRAILS.md`

Each needs its consequence attached in your own file, because a fresh context has no memory of why.

- **Never `git push`.** Not to any remote, not as a draft PR. Pushing is the person's decision.
- **Never `git add -A` or `git add .`.** Stage by explicit path, every time. Untracked junk sits in
  most repo roots, and with a second loop or a second agent running, `-A` commits somebody else's
  half-finished work under your message.
- **Never commit to the default branch**, and never merge a pull request.
- **Never generate a migration** without a checkpoint that says to. Migration state is usually
  serialised repo-wide, so a second concurrent generation conflicts every time.
- **Never run an infrastructure apply or destroy, or any cloud delete.**
- **Never read `~/.ssh` or a workspace-root `.env`.**
- **Never write a secret into a file, a commit, a journal entry, a fixture or a log line.** Check
  presence by length or truthiness only, and read it inline into the call so no test frame binds it
  — a `--showlocals` failure must not be able to print it.
- **No unattended paid API calls.** A supervised single call is a decision a person made. A loop
  making them is not. If the key is exposed and not yet rotated, that is a hard stop rather than a
  caveat.
- **Never add a dependency to a shared lockfile.** One shared resolution means a package with no
  wheel for the pinned interpreter fails the lock for the whole repo and blocks every unrelated
  branch.

## 4 · When two loops or two agents run at once

**One agent per worktree.** Two agents in one checkout collide on shared files — `__init__.py`,
`conftest.py`, the manifest — and on each other's half-finished edits. A fresh worktree has no
virtualenv, because it is gitignored, so sync it before pointing an agent at it.

**Never kill a process you did not start by name.** `taskkill /F /IM python.exe` or `pkill -f node`
kills every sibling lane's suite too, and nothing in an image name distinguishes your load
generator from another agent's twenty-minute run. Record the PID of what you start and stop that
PID. The cost is not the lost run; it is that the victim sees a non-zero exit with no failure
summary, cannot reproduce it, and now has to decide whether its own change is flaky.

**Name the worktree root in one constant at the top of any mutation harness, and assert it is the
directory the harness runs from.** A hardcoded root is one typo away from editing the tree
everything gets merged into, and nothing about that failure announces itself.

**Prefix every scratchpad file with the lane's name.** The scratchpad is shared, backup filenames
collide, and a harness that crashes on a name collision leaves a source file mutated until someone
restores it by hand.

**A red suite is not always your lane.** Any test that reads another checkout's working tree
depends on a directory you do not control. If every failure is in that one file, check `git status`
next door before treating it as a finding. A file being typed next door is the common cause; a real
divergence is the rare one, and it does not repair itself on a re-run.

**Never carry a number across a cycle.** Backlog counts, test totals and `HEAD` are read fresh at
the moment they are used, because another loop commits to this branch between your reads.
