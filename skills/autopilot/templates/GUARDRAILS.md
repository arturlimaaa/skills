# Guardrails

**Drafted by <WHO> on <DATE>.** If an agent drafted this file, say so here and say which lines a
person has since ratified. This file is a standard the loop is measured against, and a standard the
graded party wrote is a different instrument from one it was handed. `git log` cannot show the
difference: the commit author is whoever's git config is on the machine, not a statement about who
wrote the text.

**The loop never edits this file.** An agent that wants a rule changed writes the request into
`JOURNAL.md` and stops.

Two kinds of rule live here. The **forbidden actions** are permanent or expensive to undo. The
**working rules** are the repo conventions a worktree agent cannot otherwise see, because
`CLAUDE.md` and `AGENTS.md` are gitignored and do not propagate.

---

## 1 · Forbidden actions

Each carries its consequence. A fresh context has no memory of why, so the reason is part of the
rule.

**Never `git push`.** Not to any remote, not as a draft PR. Pushing is <PERSON>'s decision and they
have not given it. Commit locally on `<BRANCH>`.

**Never `git add -A` or `git add .`.** <REASON: what untracked junk sits in this repo root, or what
other agent shares this tree.> Stage by explicit path, every time.

**Never commit to `<DEFAULT BRANCH>`**, and never merge a pull request.

<Add the rest, one per paragraph, each with its consequence. Delete any that do not apply.
GATE-HYGIENE.md section 3 in the skill lists the ones that are almost always right: migrations,
shared lockfiles, infrastructure applies, cloud deletes, `~/.ssh` and `.env`, secrets in files,
unattended paid API calls.>

---

## 2 · Not forbidden, contrary to older notes

<Rules that older documents in this repo still state and that no longer hold, with the commit or
decision that removed them. This section exists because a fresh context reads those documents and
obeys them. Delete the section if there are none.>

---

## 3 · Working rules

These come from `<the gitignored conventions file>`, which no worktree agent can read.

### Tests

<The repo's testing rules. Some that earn their place in most repos:>

- **Write the test first. Run it. See it fail. Then implement.** A test that has never been seen red
  proves nothing.
- **Assert identity, not category.** Pin the specific constraint name, error kind or message. A bare
  `raises(SomeBroadError)` stays green when the wrong thing fires.
- **Expected values must not be derived from the output under test.** An expectation built from the
  response cannot fail.
- A generated parametrization or a guardrail query driven by live state needs a non-empty guard, or
  it passes vacuously when its source goes empty.

### Code

<The repo's code conventions. Not a general style guide: only what an agent would otherwise get
wrong here.>

### Prose, in commits and in `JOURNAL.md`

<How this repo writes. One idea per sentence, active voice, lead with the conclusion, one term per
concept, and how to reference issues.>

### Documents the repo keeps in step with the code

The rules lens in `PROMPT.md` step 5 is pointed at this list. **A document missing from it is a
document nothing checks.**

- `<path>` - <what it holds, and which part of it goes stale first>

A document that is now wrong is a **finding**, reported in `JOURNAL.md`. The loop does not edit a
specification to agree with the branch, and it does not edit a document this list does not name.

---

## 4 · How to run a gate

**Use `<the project runner>`, never a bare tool.** An activated virtualenv exports `VIRTUAL_ENV` and
follows you into other worktrees. A bare call silently runs another worktree's code and produces a
confidently wrong result rather than an error.

**Capture the exit code immediately. Never pipe a gate into `grep` and then read `$?`.** The exit
code would come from `grep`.

**Redirect a gate to a file. Do not pipe it into `tail` or `head` either.** Those close stdout as
soon as they have their lines, and a runner can then die in its own logging teardown and exit 1 with
every test passed.

**Restore a mutation from a file copy, never from git, while the tree holds uncommitted work.**
`git checkout -- <file>` discards every uncommitted edit in that file, not only the mutation.

<Add every trap measured in this repo: a tool that needs an environment variable to not die while
passing, a suite that takes long enough to need chunking, a path the gate set structurally does not
read. Each one has produced a false failure or a false pass somewhere. Date them.>

The gate set, run from the worktree root:

```
<GATE SET, one command per line>
```

<Anything that is not in the gate set and why: an integration suite needing a container, a slow
end-to-end run, a pre-commit superset.>

---

## 5 · Secrets

<Where this project's secrets come from, and what is not allowed. If any key is exposed and not yet
rotated, say so here and forbid every unattended call that uses it: a supervised single call is a
decision a person made, a loop making them is not.>

Never write a key into a file, a commit, a journal entry, or a log line.

---

## 6 · Stop conditions

The loop stops, writes `JOURNAL.md`, and waits for a person when any of these is true.

1. No checkpoint qualifies, because every remaining one is `OPERATOR`, carries a `blocked` marker,
   or has an unmet `needs`.
2. The working tree is dirty at the start of an iteration.
3. A gate that passed in an earlier iteration now fails, and the cause is not the current change.
4. The same checkpoint has failed its gate in three consecutive iterations.
5. Finishing would need one of the forbidden actions in section 1.
6. The work needs a decision that changes a settled contract.
7. A `blocking` refutation survived one fix attempt, or the three lenses could not be run at all. An
   unrefuted checkpoint is an unproven checkpoint. `PROMPT.md` step 5 holds the procedure.

**One `OPERATOR` or `blocked` checkpoint is not a stop.** The loop walks past it, makes sure
`NEEDS-OPERATOR.md` says what it needs and what it unblocks, and keeps reading down the file.
`PROMPT.md` step 2 is the procedure.

**Stopping is a success.** A loop that marks an unprovable checkpoint done is the failure this whole
directory exists to prevent.
