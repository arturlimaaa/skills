# Dispatch template

The prompt handed to an implementation agent for one checkpoint. Every section below is here
because its absence cost something in the reference run. Fill the `<>` placeholders and delete the
guidance in parentheses.

Send it with the Agent tool, `run_in_background: false`, so the result comes back before the next
step. One checkpoint per agent.

---

You are implementing ONE checkpoint. Work only in this worktree:

    <absolute path>        (branch <branch>)

Read `autopilot/GUARDRAILS.md` FIRST and obey it. It restates repo rules that are otherwise
invisible here, because `.claude/CLAUDE.md` is gitignored and does not reach a worktree. Then read
the `<ID>` entry in `autopilot/CHECKPOINTS.md` in full.

The tree is clean at commit `<sha>`. Baseline, all green:

    <gate 1>   -> <number> passed
    <gate 2>   -> <number> files
    <gate 3>   -> <number> contracts
    <gate 4,5> -> clean

(The baseline is what makes a regression visible. Without it an agent cannot tell a number it
caused from a number it inherited.)

<Any environment trap that has already produced a false failure. Example: "Export
PYTHONIOENCODING=utf-8 before any gate. Without it `uv run lint-imports` exits 1 while passing.">

# The checkpoint

    id: <id>
    gate: <the one command>

DONE WHEN:
- <clause>
- <clause>
- `<gate>` exits 0, and so do the other <n> gates.

# Why this exists, so you can judge the cases the instructions do not cover

<Two or three sentences on the problem, and what breaks today without it. This is what lets an
agent make a good call on something the DONE WHEN clauses do not reach. Skipping it produces
literal compliance and nothing more.>

# What already exists and must be reused rather than rebuilt

- `<path>` — <what it is, and which part to read first>
- `<path>` — <what it is>

<Name the things a fresh context would rebuild. In the reference run this prevented a second key
renderer that could disagree with the first, more than once.>

# Decisions already made for you

**<The decision.>** <Why, in one or two sentences.>

<Separate these from the ones you are delegating. An agent that cannot tell a settled decision from
an open one either re-litigates the settled ones or quietly decides the open ones.>

# Decisions that are yours, and what to weigh

You choose <the thing>. Consider at least these, and say in your report which you picked and why:
  (a) <option>
  (b) <option>
  (c) <option>

Constraints that must hold whichever you pick:
- <constraint>
- <constraint>

<Give real choices with the tradeoffs. In the reference run agents chose better than the dispatch
suggested more than once, and said why.>

# The rule that decides whether this checkpoint succeeded

<The one property that must not break. State the failure, not the instruction.>

**If <the thing the checkpoint assumes> turns out to be false, STOP.** Do not <the tempting
workaround>. Write exactly what you found into your final report and leave it alone. That outcome
is a finding, and it is worth more than a green test.

# Working rules

- Write the tests FIRST. Run them. Confirm they fail for the reason you expect, not on an import
  error. Report the red output with its exit code.
- Always `<the project runner>`. Never a bare `pytest` / `python` / equivalent.
- Never pipe a gate into `grep` and then read `$?`. The exit code would be grep's. Capture it
  immediately.
- **Restore a mutation from a file copy, never from `git checkout --`,** while the tree holds
  uncommitted work. `git checkout --` discards every uncommitted edit in the file, not only the
  mutation.
- <If anything lives outside the test and type-check paths — scripts, config — say so, and require
  a by-hand run with its exit code.>
- Do NOT commit. Do NOT push. Leave changes in the working tree; a supervisor reviews the diff,
  runs the gates independently, and commits.
- Never `git add -A` or `git add .`.
- Do not edit anything under `autopilot/`. The supervisor owns those files.
- <Documents that are read-only for this checkpoint.> If one is now wrong, that is a finding for
  your report, not an edit.
- <Documents you MUST update, such as a repository map the repo rules require to change alongside
  the code.>
- No new dependency, no migration, no ADR, no <other forbidden action>.

# The standing hazard

Every checkpoint so far shipped a first draft with an assertion that could not fail, or a mutation
the suite did not catch. Before you report done, **mutate your own implementation and check the
suite goes red**. At minimum: <two or three specific mutations for this checkpoint>. Report those
exit codes.

An assertion whose two sides both descend from the function under test proves nothing.

# Report back

Your final message is the return value, read by a program. Give:

1. <The design choice you delegated> and why, including what you rejected.
2. The red test output BEFORE implementing, with its exit code.
3. Every file created or modified, by path.
4. Your mutation results, with exit codes, one line each.
5. The exact output tail and exit code of each gate, run separately.
6. <Anything checkpoint-specific worth seeing: a captured artifact, a by-hand run, a rendered
   example.>
7. Anything now wrong in a document, and anything you were tempted to fix and deliberately left
   alone.
