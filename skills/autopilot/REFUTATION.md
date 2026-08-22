# The refutation step

You wrote the change. You are the worst available judge of whether it is done. Three agents that
have not seen your reasoning read it cold and try to prove it is not.

**A verdict you did not obtain is a verdict of refuted.** This step audits a green gate set. It is
not excused by one — in the run this harness came from, every first draft of the first pass shipped
a defect the gates were green on.

## Why it is here at all

Supervised, two parties do the work. An agent implements, and a person runs the gates and commits.
The person is the reason a self-report is never taken at face value. Unattended, those two parties
merge: one agent writes the code and reads its own exit codes. The three lenses are the only check
not run by the party that wants it to pass.

What the lenses cannot restore is a person's judgement about a finding. A blocking verdict that
survives one fix attempt halts the loop rather than being weighed. That is deliberate, and it means
an unattended run stops on things a supervised run would have absorbed. The journal says which.

## Dispatching them

`scripts/verify-checkpoint.js` holds the three prompts, named `correctness`, `tests` and `rules`.
Two callers use them: a supervisor runs the file as a Workflow script, and the loop reads the
prompts out of it and dispatches them itself, because `PROMPT.md` step 5 needs the verdicts in hand
before it records anything. Both refute against the same wording, which is why the prompts live in
one file.

**Dispatch one agent per lens in a single message**, so they run at the same time and cannot see
each other. Fill in the values the file names:

```
worktree   <absolute path>
branch     <branch>
id         <checkpoint id>
goal       <the done when: clause, in its own words>
files      NEW <paths>; MODIFIED <paths>
confirmed  <the gates already run, with their exit codes>
staleDocs  <the document list from GUARDRAILS.md §3>
traps      <the false-failure traps from GUARDRAILS.md §4>
```

Then append your own suspicion to each lens: the thing you are least sure of, the mutations you did
not get to, the document you think just went stale. Those three sentences turn a generic review
into a specific one.

**Fill `confirmed` with what you actually ran.** Three agents re-running your gates spend their
effort where you already spent yours. Padding it with things you did not check buys a quiet verdict
over a defect you still have.

The lenses are read-only. They leave the tree as they found it.

**Do not end the iteration until all three verdicts are in hand.** An iteration that finishes while
a lens is still running has recorded a checkpoint nothing audited. A lens that died is not a lens
that passed.

## The three lenses

**correctness** — does the change achieve the stated goal, completely? Unasked-for behaviour
changes. Import directions and cycles. Callers, scripts, tests and documents that reference a moved
or renamed thing and were missed, searched across the whole worktree including markdown and yaml.
Code paths reachable in production that no test reaches. Anything the gate set structurally does
not read.

**tests** — do the tests prove anything? For every test added or changed: name a plausible mutation
of the production code and say whether the suite catches it, with exit codes rather than
impressions. Expected values derived from the output under test cannot fail. Assertions on a
category rather than an identity stay green when the wrong thing fires. Coverage the change
deleted. Tests that pass vacuously on an empty generated list.

**rules** — the repo's own standard. Read `GUARDRAILS.md` in full and audit the diff against it:
forbidden actions, checked against `git status --porcelain -uall` rather than a diff; comment and
prose conventions; one term per concept; and which documents this change made stale, checked
against the list in §3. A stale document is **reported, never edited to agree with the branch**.

## What a verdict obliges

| severity | what you do |
|---|---|
| `blocking` | Fix it. Re-run the full gate set. Refute once more. If a blocking verdict survives that second pass, revert the changes, journal both verdicts in full, and stop |
| `worth-fixing` | Fix it if the fix sits inside this checkpoint's `done when:` clause. If it does not, leave the code alone and file it in `NEEDS-OPERATOR.md` with file and line |
| `note` | One line in the journal. Change nothing |
| `none` | Nothing |

**A blocking verdict may not be dismissed by reasoning about it.** No path exists where the loop
explains why a lens was wrong and carries on. Fix it, or revert and stop, and let the person read
the journal and decide which of you was right. This rule exists because the loop is the only party
here who wants the verdict dismissed.

**Refute at most twice per checkpoint.** A third round means the checkpoint is wrong rather than the
code, and that is a finding rather than a task.

## Calibration

A checkpoint that is genuinely fine should come back `refuted=false`. Tell the lenses so. A lens
that inflates every note into a blocking verdict halts an overnight run for nothing, and a harness
that halts on noise gets switched off.
