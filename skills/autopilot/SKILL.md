---
name: autopilot
description: Drive a long backlog to completion through supervised agent iterations, where every item is proved by a gate command and survives an adversarial pass. Use for multi-hour work with many well-defined checkpoints — a build phase, a migration, a sweep, a hardening pass — when what matters is that nothing gets marked done that was not proved. Not for planning, and not for a handful of items.
---

# Autopilot

A backlog too long for one context, worked one checkpoint at a time, where **the only thing that
marks an item done is an exit code you ran yourself**.

The loop is: pick the next checkpoint, dispatch an agent with the full context it needs, run the
gates independently, try to refute the result, record what happened, commit, repeat. It stops when
nothing is left that an agent can prove, and hands the rest to a person.

This skill executes a backlog. It does not chart one. If the work is still foggy, plan it first
and come back with checkpoints. `prd-to-plan` and `to-issues` are the planning half.

## When to invoke this

- A backlog of ten or more items that are each provable by a command.
- Work measured in hours, where a single context will not survive to the end.
- A phase of a build, a migration across many call sites, a hardening pass, a test-coverage sweep.
- The user asked to "work through" something until it is finished.

Do not invoke it for three items. The overhead is real and it is described under **Limits**.

## The one rule everything else serves

**Every checkpoint carries `gate: <shell command>` or `gate: OPERATOR`, and `OPERATOR` is a halt
that an agent cannot set to done.**

A backlog mixing provable and unprovable items *will* have the unprovable ones marked complete. The
schema stops that, not good intentions in a prompt. Everything below is machinery around this rule.

---

## 1 · Set up the harness

**Six templates go into the repository** as `autopilot/`: `PROMPT.md`, `GUARDRAILS.md`,
`CHECKPOINTS.md`, `JOURNAL.md`, `FINDINGS.md`, `NEEDS-HUMAN.md`. Commit them on the working branch
before the first iteration. **Untracked files are invisible to an agent working in a worktree**,
so an uncommitted harness is no harness.

Add `autopilot/HALT` to `.gitignore`. It is a per-machine sentinel, not shared state.

**The rest stay with you** and never enter the repo: `dispatch.md` (you fill it per checkpoint),
`verify-checkpoint.js` (you run it through the Workflow tool), and `run.ps1` / `run.sh` (only for
unattended mode, and only once the gates are trusted).

The repo files are split by **who writes them**, not by topic. Collapsing them produces the failure
where the loop rewrites the instructions it is about to follow.

| File | Written by | Discipline |
|---|---|---|
| `PROMPT.md` | you only | The whole instruction for one iteration. The loop never edits it |
| `GUARDRAILS.md` | you only | Forbidden actions, and repo rules an agent cannot otherwise see |
| `CHECKPOINTS.md` | you write items, the loop writes `status:` | The ordered backlog |
| `JOURNAL.md` | the loop | Append-only. Real gate exit codes, including failures |
| `FINDINGS.md` | you first, the loop appends | Facts that cost a measurement. Never deleted |
| `NEEDS-HUMAN.md` | the loop appends, you clear | What only a person can do |
| `HALT` | the loop | Gitignored sentinel; stops an unattended driver |

**`GUARDRAILS.md` exists for a specific reason: `.claude/` is gitignored in most repos, so
`CLAUDE.md`'s conventions never reach an agent working in a worktree.** Restate them there. That is
the single highest-value file for output quality, and the easiest to skip.

Fill `FINDINGS.md` before the first iteration with anything already learned the expensive way:
measured throughput, API quirks, traps that returned a wrong answer instead of an error. Each entry
saves an agent from rediscovering it.

## 2 · Author the checkpoints

Each is a block a program can parse plus prose a person wrote:

```
id: kebab-case-id
status: todo
gate: uv run pytest path/to/test_thing.py
needs: earlier-id
blocked:
source: where the requirement comes from
```

Then, in prose: **done when** (the scope, and only the scope), and **watch out** (what a fresh
context would get wrong).

Four rules for writing them, each learned by getting it wrong:

- **Size one checkpoint to one fresh context.** If it needs a file the checkpoint does not name,
  the checkpoint is wrong.
- **The gate must test the deliverable.** A gate pointed at the wrong file passes while proving
  nothing. Check each one against what the checkpoint actually builds.
- **A `gate:` field holds ONE command.** A compound with `&&` gets read as one exit code.
- **When a checkpoint says "remove X", say what must survive.** This is the only failure in the
  reference run where the harness itself caused the damage: a checkpoint said "no test asserts on a
  prompt string", and the agent correctly deleted a test that asserted *the transcript reaches the
  model* — a data-flow property, not prompt wording. Measured afterwards: the transcript could be
  removed from the prompt entirely and all 460 tests still passed.

Order the file so `needs:` always points upward. The loop walks from the top and takes the first
qualifying item.

## 3 · Pick one checkpoint

Walk `CHECKPOINTS.md` from the top. Take the **first** where `status: todo`, `gate:` is a command,
`blocked:` is empty, and every `needs:` is `done`.

**One. Never two.** In the reference run two adjacent checkpoints were taken together to save time;
they became inseparable in a single documentation paragraph and could not be committed apart. The
rule has a cost attached, which is why it is a rule.

A checkpoint you skip is not a halt. An `OPERATOR` gate or a `blocked:` marker means walk past it,
make sure `NEEDS-HUMAN.md` says what it needs, and keep reading down the file.

## 4 · Dispatch an agent

Use `templates/dispatch.md`. It converged over thirteen iterations and every section in it is there
because its absence cost something.

The parts that matter most:

- **The baseline numbers.** Tell the agent what green looks like now, so a drop is visible.
- **Why the checkpoint exists**, so the agent can judge the cases the instructions do not cover.
- **Decisions already made**, separated from **decisions that are yours**, with what to weigh. An
  agent given a real choice and the tradeoffs makes better calls than one given a recipe. In the
  reference run, agents chose better signatures than the dispatch suggested more than once.
- **The standing hazard**, verbatim: *"Before reporting done, mutate your own implementation and
  confirm the suite goes red. Report those exit codes. An assertion whose two sides both descend
  from the function under test proves nothing."*
- **Agents do not commit.** They leave the tree dirty; you review, run gates, and commit. This is
  what makes a bad iteration a `git checkout` rather than a revert.

## 5 · Run the gates yourself

**Never take the self-report.** Run the checkpoint's gate and the full set, capturing each exit
code before any pipe.

Then check the things a gate cannot see:

- `git status --porcelain -uall`, because **`git diff` cannot see an untracked file**. A new module
  the whole change depends on shows only as `??` and falls out of a hand-assembled commit.
- Whether anything forbidden was touched: dependency files, migrations, generated config.
- Whether a script changed. Scripts are usually outside the test and type-check paths, so a broken
  import there passes every gate. Run it by hand.

## 6 · Try to refute it

Invoke the bundled workflow. `scriptPath` takes an absolute path and takes precedence over
`script`, so point it at this skill's own copy:

```
Workflow({
  scriptPath: "<this skill's directory>/templates/verify-checkpoint.js",
  args: {
    worktree: "<absolute path>",   // required
    branch:   "<branch>",          // required
    id: "...", goal: "...", files: "...", confirmed: "...",
    correctnessExtra: "...", testsExtra: "...", rulesExtra: "..."
  }
})
```

Three lenses run in parallel, each told to default to refuted if it cannot confirm something
itself:

- **correctness** — does it achieve the goal completely; any missed caller, any unasked behaviour
  change
- **tests** — name a plausible mutation and run it; is any expectation derived from the output
  under test; did coverage shrink
- **rules** — forbidden actions, comment and prose conventions, and which documents just went stale

Feed each lens what you already confirmed, so it spends its effort elsewhere. Pass per-lens
`correctnessExtra` / `testsExtra` / `rulesExtra` naming the specific thing you most suspect.

**In the reference run this found a real defect in every single checkpoint**, including several the
full gate set was green on. Two examples of what it catches: a fixture whose keys happened to equal
what the code would render, so a second renderer was indistinguishable from reading the manifest;
and a test comparing staged bytes against their own hash, which holds for any value.

Fix what is real. Re-run the gates. Some findings are for the backlog, not for now — say which.

## 7 · Record, then commit

Append to `JOURNAL.md`: the checkpoint id, the outcome, **every gate with its real exit code**, the
files touched, and what happened in a few sentences. Record deviations and defects you chose not to
fix. A journal that only records successes is a marketing document.

Set that checkpoint's `status:` to `done`. Change only that line.

Stage by explicit path, never `git add -A`. Commit with a message that says what changed and why
the obvious approach was wrong, if it was.

Then repeat from step 3.

## 8 · Stop honestly

When no checkpoint qualifies, stop. Make sure every remaining item is represented in
`NEEDS-HUMAN.md` with what it needs and what it unblocks, and report:

- what is done, with the gate numbers
- what the verification caught, because that is the evidence the process worked
- what is waiting on a person, ordered by cost to them

**Stopping is a success.** A loop that marks an unprovable checkpoint done is the failure the whole
harness exists to prevent.

---

## Limits (be honest)

**This is expensive.** The reference run was thirteen checkpoints over many hours and roughly three
million subagent tokens. Per checkpoint: one implementation agent, three verification agents, and
several full gate runs. Do not invoke it for a short list.

**The verification is the cost, and removing it gives you a different and worse procedure.** Every
first draft in the reference run had a defect the gates were green on. Strip the lenses to go
faster and the loop's output becomes unaudited agent work with a nice journal.

**Gates lie in environment-specific ways, and you will find your own.** In the reference run
`lint-imports` exited 1 while passing whenever stdout was not a real file, because it printed an
emoji spinner through a codepage that could not encode it. Write each one into `FINDINGS.md` the
first time it fires, or every future iteration re-debugs it.

**Long agent runs need chunking.** A background command capped at ten minutes killed a
forty-two-minute job and left nothing.

**The supervisor's context runs out before the backlog does.** That is the binding constraint,
not wall clock. In the reference run it began to bite around the eighth checkpoint. This is the
strongest argument for the file set existing at all: `JOURNAL.md` and `CHECKPOINTS.md` are
written after **every** iteration rather than at the end, so the run survives its own
summarisation and can be picked up by a context that was not there for the first half.

**It needs a clean tree and a green gate set to start.** A loop started on a red gate cannot tell
its own damage from what it inherited.

## What this does NOT do

- **Plan the work.** The backlog is an input. `prd-to-plan` and `to-issues` produce one.
- **Run unattended by default.** The procedure above is supervised: an agent implements, you verify
  and commit. `templates/run.ps1` and `templates/run.sh` drive it unattended, but only after the
  gates are trusted and nothing on the path spends money or touches production.
- **Prove anything needing hardware, a real bucket, a quiet room, or a person's judgment.** Those
  are `OPERATOR`, and they halt.
- **Decide anything the user reserved.** A checkpoint that would change a decision they asked to be
  consulted on gets `blocked:` and an entry in `NEEDS-HUMAN.md`, however small the code change is.

## Capture learnings

Findings outlive the run. When an iteration turns up something a fresh context would pay to
relearn, append it to `FINDINGS.md` under the matching section, and never delete one. A finding
later proved wrong gets a `SUPERSEDED` line saying what replaced it and what proved it, so the
record of the wrong turn survives.

When a rule in `GUARDRAILS.md` turns out to be wrong or missing, that is the user's call, not the
loop's. Write the request into `JOURNAL.md`.
