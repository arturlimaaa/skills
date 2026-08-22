# The state files

A loop that runs an agent in a fresh context every iteration has one source of truth: the files on
disk. Conversation history is gone. So each thing the loop needs has to live somewhere, and the
files are split by **who writes them**, not by topic.

Collapsing them produces the classic failure where the loop edits the instructions it is about to
follow. A criterion edited in the same commit that claims to meet it cannot afterwards be told
apart from a criterion written to fit what was built.

| File | Written by | Discipline |
|---|---|---|
| `PROMPT.md` | the person only | The whole instruction for one iteration. Stable. The loop never edits it |
| `GUARDRAILS.md` | the person only | Forbidden actions, and the repo rules a worktree agent cannot see |
| `CHECKPOINTS.md` | the person writes items, the loop writes `status:` only | The ordered backlog. One checkpoint per iteration |
| `JOURNAL.md` | the loop | Append-only. What each iteration did, with real gate exit codes |
| `FINDINGS.md` | the person first, the loop appends | Facts that cost a measurement. Never deleted |
| `NEEDS-OPERATOR.md` | the loop appends, the person clears | Everything only a person can do. The loop files here and walks on rather than waiting |
| `HALT` | the loop | Gitignored sentinel. Its presence stops the driver |
| `config` | the person only | Branch, watched trees, agent command |
| `run.sh` / `run.ps1` | the person only | The driver |
| `verify-checkpoint.js` | the person only | The three refutation lens prompts |

## Why `GUARDRAILS.md` is separate from `PROMPT.md`

`CLAUDE.md` and `AGENTS.md` are gitignored in many repos, so the repo's own conventions never reach
an agent working in a worktree. Those rules are restated in `GUARDRAILS.md`, which is tracked and
therefore visible. `PROMPT.md` stays the procedure; `GUARDRAILS.md` stays the standard. The loop
edits neither.

## `JOURNAL.md` is append-only

Never rewrite or delete an earlier entry, including one that records a mistake. The record of a
wrong turn is what stops the next iteration repeating it. An entry has a fixed shape so a person
can read a night's run without opening the diffs:

```
## <iso timestamp> - <checkpoint id>

outcome: done | reverted | stopped
gates:
  <command>  -> <exit code>  (<what it reported>)
refutation:
  correctness -> refuted=<bool> <severity> <the finding, or "-">
  tests       -> refuted=<bool> <severity> <the finding, or "-">
  rules       -> refuted=<bool> <severity> <the finding, or "-">
  acted on: <what you fixed, and what you left, with the reason>
touched: <paths>
what happened: <three sentences at most>
next: <the id of the checkpoint that is now next, and anything blocking it>
```

Record all three verdicts, the clean ones and the ones the loop disagreed with. A journal holding
only the lenses that found nothing is the marketing document this file exists to not be.

## `FINDINGS.md` holds facts, not tasks

A finding is something that cost a measurement to learn and would have changed how an iteration
worked: a gate that fails while passing, a tool that lies about its exit code, a suite that takes
twelve minutes, a convention two documents disagree about. It is written once and never deleted,
because a fact that is deleted gets re-learned at the same cost.

**Numbering is the person's job when several sessions run at once.** Two sessions appending to this
file cannot see each other's numbering, and section numbers get referenced by other sections and by
commit messages, so a duplicate is not cosmetic. Concurrent agents write their finding to a
scratchpad file and name the path in their report; the supervisor merges it and assigns the number
at commit time.

## `NEEDS-OPERATOR.md` is why the loop does not wait

Every entry says **what a person has to do** and **what it unblocks**. An `OPERATOR` gate, a
`blocked:` marker or an unmet `needs:` is not a halt: the loop files the entry, walks past, and
takes the next provable checkpoint. This file is how the person finds the work only they can do,
and it is the reason a blocked item does not cost a whole night.

## `HALT` stops the driver

One line saying what is holding the loop. Written by the loop, deleted by the person once the
blocker clears. Gitignored, never committed, and **never deleted by the loop itself**. The driver
reads it before every iteration and exits.

## A published dashboard is not part of the loop

If you generate an HTML view of the roadmap for a person to read, it is a human artifact. It is
generated from these files and is never read by an agent, because agents read tracked files in a
worktree and cannot fetch a web page. **These files are the state. The page is a view of it.** When
the two disagree, these files win.
