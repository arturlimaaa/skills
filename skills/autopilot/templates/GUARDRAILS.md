# Guardrails

Written by the user. **The loop never edits this file.** An agent that wants a rule changed writes
the request into `JOURNAL.md` and stops.

Two kinds of rule live here. The **forbidden actions** are permanent or expensive to undo. The
**working rules** are the repo conventions an agent cannot otherwise see, because `.claude/` is
gitignored in most repos and does not reach a worktree.

> **This is the highest-value file in the harness and the easiest to skip.** Fill section 3 by
> reading the repo's `CLAUDE.md` and `AGENTS.md` and restating what an agent must obey. Without it
> the loop's output quality degrades silently, one convention at a time.

---

## 1 · Forbidden actions

Each carries its consequence. A fresh context has no memory of why, so the reason is part of the
rule. Write the ones that apply to this repository; delete the rest.

> Pattern to follow: **state the action, then the damage, then why it cannot be undone.** A rule
> without its consequence gets rationalised away by an agent that thinks it has a good reason.

**Never <write to the table / touch the resource>.** <What accepts the bad value, and why nothing
removes it afterwards.>

**Never `git push`.** Not to any remote, not as a draft PR. <Or delete this if pushing is wanted.>

**Never `git add -A` or `git add .`.** <Name what is sitting untracked in the repo root that would
be swept in.> Stage by explicit path, every time.

**Never add a dependency.** <The shared lock, the resolution, or whatever makes one expensive.>

**Never generate a migration.** <The serialisation constraint.>

**Never commit to `<default branch>`.**

**Never run <destructive infra command>.** Never merge a pull request.

**Never read `~/.ssh` or a workspace-root `.env` file.**

---

## 2 · Not forbidden, contrary to older notes

<Rules that documents in this repository still assert but that no longer hold. An agent obeying a
dead rule burns iterations. Name the commit or PR that killed it.>

---

## 3 · Working rules

These come from `<the gitignored file>`, which no worktree agent can read.

### Tests

- **Write the test first. Run it. See it fail. Then implement.** A test that has never been seen
  red proves nothing.
- **Assert identity, not category.** Pin the specific constraint name, error kind or message.
- **Expected values must not be derived from the output under test.** An expectation built from the
  response cannot fail.
- **No mocks, no monkeypatching.** Pass a real in-memory implementation. <Name the ones this repo
  already has; they are production code and are the correct thing to pass.>
- A generated parametrization needs a non-empty guard, or it passes vacuously when its source goes
  empty.
- <Repo-specific test conventions.>

### Code

- <The repo's stated coding principles: parse-don't-validate, immutability, early return, whatever
  applies. Copy them, do not paraphrase.>

### Comments

- **Default to fewer comments.** Comment intent, never restate the code.
- <The repo's comment budget and any banned separators or words.>

### Prose, in commits and in `JOURNAL.md`

- <The repo's writing conventions. Copy them.>

---

## 4 · How to run a gate

**Always `<the project runner>`. Never a bare `pytest` / `python` / equivalent.** <Why: usually an
activated virtualenv that follows you between checkouts and silently runs the wrong code.>

**Capture the exit code immediately. Never pipe a gate into `grep` and then read `$?`.** The exit
code would come from `grep`.

**Restore a mutation from a file copy, never from git, while the tree holds uncommitted work.**
`git checkout -- <file>` discards every uncommitted edit in that file, not only the mutation.

**Chunk any long-running job under the background command cap.** <Name the cap. A command killed
part-way usually leaves no output at all.>

<Any gate that lies on this machine. Write each one here the first time it fires, with its symptom
and its fix, or every future iteration re-debugs it.>

<Any path outside the gate set — scripts, config, generated files — where a break passes every
gate. Say that a checkpoint touching one must run it by hand and record the exit code.>

The gate set, run from the repository root:

```
<gate 1>
<gate 2>
<gate 3>
```

---

## 5 · Secrets

<Any credential state that constrains the loop. If a key is exposed or unrotated, say plainly that
no checkpoint calling a paid API may run unattended until it is fixed: a supervised call is a
decision a person made, and a loop making them is not.>

Never write a secret into a file, a commit, a journal entry, or a log line.

---

## 6 · Stop conditions

The loop stops, writes `JOURNAL.md`, and waits for a person when any of these is true.

1. The working tree is dirty at the start of an iteration.
2. A gate that passed in an earlier iteration now fails, and the cause is not the current change.
3. The same checkpoint has failed its gate in three consecutive iterations.
4. Finishing would need one of the forbidden actions in section 1.
5. The work needs a decision that changes a settled contract.
6. No checkpoint qualifies, because every remaining one is `OPERATOR` or `blocked`.

**Stopping is a success.** A loop that marks an unprovable checkpoint done is the failure this whole
directory exists to prevent.
