# Supervising a run

The loop's whole output is files. Read them in this order.

## 1 · Did it stop, and why

```
cat autopilot/HALT 2>/dev/null || echo "no halt"
tail -80 autopilot/JOURNAL.md
git log --oneline -20
git status --porcelain -uall
```

`HALT` says what is holding the loop in one line. The journal's last entry says it in full. The two
should agree; when they do not, the journal is the record and `HALT` is the summary.

A run that ended without `HALT` and without exhausting its iteration count means the driver stopped
on a dirty tree — an iteration died mid-edit. Read the diff before doing anything else, and copy it
aside before touching it.

## 2 · Was each `done` actually done

For every entry with `outcome: done`, check three things against the commit, not against the
entry's own prose:

- **The gate lines carry real exit codes**, and the gate set listed is the one in `GUARDRAILS.md`
  §4. A substituted or narrowed gate is a finding.
- **All three verdicts are recorded**, including the ones the loop disagreed with. A journal
  holding only clean lenses is the failure mode; a missing lens is a checkpoint nothing audited.
- **`touched:` matches the commit's file list**, and the commit stages by explicit path. Files
  outside the checkpoint's `files:` list mean the checkpoint was scoped wrong.

Re-run the gate set yourself from the merge point. The loop's exit codes were true of its tree, not
necessarily of yours.

## 3 · Read the refutations that were acted on

The `acted on:` line is where the judgement lives. A `worth-fixing` verdict the loop left alone
should have an entry in `NEEDS-OPERATOR.md` with file and line. A `blocking` verdict that was
argued away rather than fixed or reverted is a rule violation, and it is the single thing most
worth checking by hand.

## 4 · Clear the person's queue

`NEEDS-OPERATOR.md` is the backlog of work only you can do, each entry saying what it needs and
what it unblocks. Work it, then delete the entries you cleared and any `blocked:` markers they
release.

Then delete `autopilot/HALT`. That is the only thing that lets the loop start again, and it is
deliberately a human action.

## 5 · Feed back what the run taught

- A fact that cost a measurement goes into `FINDINGS.md`, numbered by you, never deleted later.
- A trap that produced a false failure goes into `GUARDRAILS.md` §4 so the next fresh context does
  not rediscover it.
- A checkpoint that was wrong gets reworded in its own commit, before the work.
- A rule the loop asked for in the journal gets ratified by you or refused. The loop never edits
  `GUARDRAILS.md` or `PROMPT.md`, so a request sitting in the journal is a request nothing acts on
  until you do.

## What to report back

Lead with the count, then the exceptions:

```
N iterations, M checkpoints done, K reverted, halted on <reason>.

Done:      <ids, one line each>
Reverted:  <ids, and the gate that failed>
Blocking verdicts that survived: <ids, and the finding>
Waiting on you: <NEEDS-OPERATOR entries, and what each unblocks>
Disagreements worth your judgement: <the loop's own objections from the journal>
```

The last line is the valuable one. The most useful results in a run of this harness came from an
agent refusing a checkpoint's premise, and premises have been wrong more than once.
