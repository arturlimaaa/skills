---
name: autopilot
description: "Set up and supervise an unattended agent loop that works a backlog one checkpoint per iteration, in a fresh context each time, proving every checkpoint with a gate command and refuting its own work with three independent lenses before it records anything. Use when the user wants an agent to run a backlog overnight or unattended, asks for an autonomous/self-driving loop over a repo, wants a checkpoint harness with guardrails, or wants to review a loop that is already running."
---

# Autopilot

A harness for running an agent loop over a backlog without a person in the room.

One iteration = one checkpoint. Fresh context every time. The loop takes the first checkpoint that
qualifies, does exactly that, proves it with a shell command's exit code, has three agents that did
not see its reasoning try to refute it, writes what happened into an append-only journal, commits,
and ends. A driver script starts the next iteration.

**The failure this exists to prevent:** an autonomous loop over a backlog that mixes provable and
unprovable items will mark the unprovable ones complete and continue. The schema is what stops
that, not good intentions in the prompt. Every checkpoint carries a gate, and `OPERATOR` — work
only a person with hardware, a real bucket or a quiet room can prove — is a classification the loop
cannot set on itself.

## When to use

- "Run this backlog overnight." / "Can an agent work through these tickets unattended?"
- "Set up a self-driving loop on this repo."
- "I want a checkpoint harness with guardrails and a journal."
- "Review the autopilot run from last night" / "why did the loop halt?"

Do **not** reach for this for a single feature or bug. The setup costs a real session, and the
refutation step spends three agents per checkpoint. It earns that on a backlog of ten or more
items where you would otherwise be the one reading every exit code.

**Do not reach for it at all when success is not an exit code.** An agent loop is good at work a
command can prove. Work that needs a person to hear, see or hold something is `OPERATOR` work, and
a backlog that is mostly `OPERATOR` should be worked by the person, not wrapped in a harness.

## The two modes

**Setup.** The user has a repo and a backlog and no harness. You install `autopilot/` from
[templates/](templates), fill in the parts that are project-specific — the branch, the gate set,
the forbidden actions, the checkpoints — and hand back a loop that is ready to start. Procedure
below.

**Supervision.** The harness exists and has run. You read `JOURNAL.md`, `HALT`, and
`NEEDS-OPERATOR.md` and report what happened, what is waiting on the person, and what the loop got
wrong. Procedure in [SUPERVISING.md](SUPERVISING.md).

---

## Setting one up

### 1 · Establish the loop can be honest here

Before writing a single file, get these three answers. A harness installed without them is a
machine for producing green journals over defects.

**What command proves a change in this repo?** Run the full gate set yourself, from a clean tree,
and record each exit code. If it is not green now, stop and say so: a loop started on a red gate
cannot tell its own damage from what it inherited. If there is no gate set at all — no tests, no
type check, no linter — say plainly that this repo cannot host an autopilot loop yet, and that
building the gate set is the work that comes first.

**What must the loop never do?** Forbidden actions are permanent or expensive to undo, and a fresh
context has no memory of why. Ask about: pushing, merging, migrations, generated lockfiles,
infrastructure commands, anything that writes to a shared database, anything that spends money.
Read [GATE-HYGIENE.md](GATE-HYGIENE.md) §3 for the ones that are almost always right.

**What in the backlog is not provable by a command?** Go item by item. Every item that needs a
person gets `gate: OPERATOR` and stays in the file. Do not quietly drop it, and do not invent a
gate that would pass without proving anything.

Ask the user these directly rather than guessing. Their answers are the entire content of
`GUARDRAILS.md` and half the content of `CHECKPOINTS.md`.

### 2 · Install the files

Copy [templates/](templates) to `autopilot/` at the repo root and
[scripts/](scripts) alongside them. They land flat in one directory, and the drivers expect that.
The set is split by **who writes them** rather than by topic. Collapsing them produces the
classic failure where the loop edits the instructions it is about to follow. The full schema and the write permissions are in [FILES.md](FILES.md).

| File | Written by |
|---|---|
| `PROMPT.md` | the person only. The whole instruction for one iteration |
| `GUARDRAILS.md` | the person only. Forbidden actions, and the repo rules a worktree agent cannot see |
| `CHECKPOINTS.md` | the person writes items, the loop writes `status:` only |
| `JOURNAL.md` | the loop, append-only |
| `FINDINGS.md` | the person first, the loop appends |
| `NEEDS-OPERATOR.md` | the loop appends, the person clears |
| `HALT` | the loop. Gitignored sentinel whose presence stops the driver |
| `config` | the person only. Branch, watched trees, agent command |
| `run.sh` / `run.ps1` | the person only. The driver |
| `verify-checkpoint.js` | the person only. The three refutation lens prompts |

Add `autopilot/HALT` to `.gitignore`. Every other file is tracked, because **a file the loop
cannot read in a worktree does not exist.** That is also why `GUARDRAILS.md` restates the repo's
conventions: `CLAUDE.md` and `AGENTS.md` are frequently gitignored, so the rules in them never
reach an agent working in a worktree.

### 3 · Fill in the placeholders

Every template marks its project-specific parts with `<ANGLE BRACKETS>`. Leave none of them.

- `autopilot/config` — the branch the loop is allowed to run on, the working trees the driver
  watches, and the agent command. Both drivers run the `agent=` value as a command and its
  arguments, split on whitespace and never handed to a shell, so pipes, semicolons, redirections
  and substitutions do not work there and neither do quoted arguments containing spaces. The file
  is tracked, and the value runs on the machine driving the loop, outside any agent's permission
  system: review a diff to `autopilot/config` as a code change, not as configuration.
- `GUARDRAILS.md` §1 — the forbidden actions from step 1, **each with its consequence attached**.
  A rule whose reason is lost gets relaxed by the next person who finds it inconvenient.
- `GUARDRAILS.md` §3 — the repo's own conventions, and the list of documents the repo keeps in step
  with the code. The rules lens is pointed at that list; a document missing from it is a document
  nothing checks.
- `GUARDRAILS.md` §4 — the gate set, with the traps you hit while running it in step 1.
- `CHECKPOINTS.md` — the backlog. Format and the rules for a good gate are in
  [CHECKPOINTS-FORMAT.md](CHECKPOINTS-FORMAT.md).
- `PROMPT.md` — the branch name and the gate set, in steps 1 and 4.

### 4 · Prove the harness before starting it

Three checks, in order:

1. `bash autopilot/run.sh --dry-run --iterations 1` (or `pwsh -File autopilot\run.ps1 -DryRun`).
   It must refuse on the wrong branch and refuse while `HALT` exists.
2. The gate set is green from a clean tree.
3. **The first checkpoint's gate fails right now.** A gate that exits 0 before its work exists is a
   rubber stamp. Measure it and report the code. `pytest` on a missing path exits 4; on a path that
   collects nothing it exits 5; both are correct starting states, and neither is 1.

Then hand it to the user with the exit codes you measured, and let them start it. **Starting the
loop is the user's decision, not yours** — an unattended loop commits to their repo and spends
their tokens for hours.

---

## Running it

```
bash autopilot/run.sh --iterations 10
pwsh -File autopilot\run.ps1 -Iterations 10
```

The driver refuses to start on any branch but the one in `autopilot/config`, and refuses to start
while `autopilot/HALT` exists. It stops early when an iteration writes `HALT` or leaves any watched
tree dirty. A fresh agent process per iteration is the point: nothing carries over but the files.

Budget for the lenses. Three agents run per checkpoint and a blocking verdict adds a second round.
That is most of the token spend, and it is what separates an overnight run from an overnight run
the user has to re-audit by hand in the morning.

---

## The three things that make it work

**A gate is an exit code, not a reading of the code.** [GATE-HYGIENE.md](GATE-HYGIENE.md) holds how
to run one without lying to yourself — never pipe a gate into `grep` or `tail`, capture the code
before any pipe, and never restore a mutation with `git checkout --` while the tree holds
uncommitted work. Every rule in that file is there because it produced a false result in a real
run.

**The loop refutes itself.** Supervised, two parties do the work: an agent implements, and a person
runs the gates and commits. The person is the reason a self-report is never taken at face value.
Unattended, those two parties merge. [REFUTATION.md](REFUTATION.md) puts three independent lenses
back in, and they are the only check not run by the party that wants it to pass. In the run this
harness came from, they found a real defect in every checkpoint of the first pass, several of them
on a green gate set.

**Stopping is a success.** The loop halts on a dirty tree, a gate that regressed, a checkpoint that
failed three times, a decision that changes a settled contract, and a blocking verdict that
survived a fix attempt. It walks *past* an `OPERATOR` or `blocked` checkpoint rather than halting,
filing what it needs in `NEEDS-OPERATOR.md` and taking the next provable item. A loop that marks an
unprovable checkpoint done is the failure the whole harness exists to prevent.

## Guardrails on you, while you set this up

- **Do not write the checkpoints and then grade the loop against them without saying so.** If you
  drafted the `done when:` clauses, the gates and the `OPERATOR` classifications, put that at the
  top of `CHECKPOINTS.md` with the date. A standard the graded party wrote is a different
  instrument from one it was handed, and `git log` cannot show the difference.
- **Do not start the loop yourself**, and do not push. Both are the user's call.
- **Do not soften a gate to make a checkpoint passable.** A gate you cannot run is worse than no
  gate, because only one of the two ways to report it is honest.
