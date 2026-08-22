# Writing the backlog

`CHECKPOINTS.md` is an ordered list. The loop takes the **first** checkpoint that qualifies and
does exactly one. Everything about whether an unattended run is trustworthy is decided here, not in
the prompt.

## The fields

| Field | Meaning |
|---|---|
| `status:` | `todo` or `done`. The loop sets `done` only after the gate exits 0 |
| `gate:` | A shell command whose exit code proves the checkpoint. `OPERATOR` means only a person can prove it |
| `done when:` | The completion criterion, in one sentence. This clause, and only this clause, is the iteration's scope |
| `needs:` | Checkpoint ids that must be `done` first. Empty means nothing |
| `blocked:` | Non-empty means the loop walks past this one. Only the person clears it |
| `source:` | Where the requirement comes from — a spec section, an issue, a review |
| `files:` | The paths the work is expected to touch. A checkpoint that needs a file outside this list is a checkpoint that is wrong |

A checkpoint qualifies when `status: todo`, `gate:` is a shell command, `blocked:` is empty, and
every id in `needs:` is `done`.

## What makes a gate real

**A gate must fail before the work starts.** Measure its exit code first and record it. A gate that
exits 0 before its work exists is a rubber stamp, and they are common: a `pytest -k` selector that
matches nothing, a grep for a string that is already there for another reason, a type check on a
file nobody changed.

Know what "correctly failing" looks like for your runner, because it is not always 1. `pytest`
treats a missing path argument as a usage error and exits **4**; a path that exists but collects
nothing exits **5**, and some coverage plugins print a full table on the way, which reads at a
glance like a suite that ran. Say which number you expect, or say "confirm it fails and report the
code".

**A gate belongs to a repository.** Do not copy a gate list from one repo into a checkpoint that
runs in another. A gate naming a linter that repo does not depend on exits *program not found*,
and there are two ways to report that of which only one is honest.

**A gate an agent cannot run is worse than no gate.** If the loop has to substitute something
narrower, that is a finding — it means either the convention is wrong or the repo is.

## `OPERATOR` is a classification, not a status

Work whose success is not an exit code gets `gate: OPERATOR`: anything needing real hardware, a
real bucket, a real room, ten minutes of real audio, a second machine making noise, a human ear or
a human eye. The loop **walks past it**, files what it needs in `NEEDS-OPERATOR.md`, and takes the
next provable checkpoint. It never claims it, and `OPERATOR` is never a status an agent can set.

**A checkpoint that mixes agent work with operator work is two checkpoints.** The agent half
carries a gate. The operator half carries `OPERATOR` and the original id, so every earlier
reference still resolves. Splitting is what stops a script nobody can run from waiting on a room
nobody has booked.

## Sizing

One checkpoint is what one fresh context can finish: write the test, see it fail, implement, run
the gate set, survive three lenses, commit. If a checkpoint needs a second context, it is two
checkpoints. If its `files:` list keeps growing during the work, it was scoped from the wrong
level.

## Rewording a checkpoint

A checkpoint that turns out to be wrong may be reworded. **The reword is its own commit, made
before the work, and never the commit that marks the checkpoint done.** The checkpoint is then
taken in the next iteration.

This is not pedantry. A criterion edited in the same commit that claims to meet it cannot
afterwards be told apart from a criterion written to fit what was built, however sound the
reasoning was at the time.

## The shape

```
### <id> · <short name>

status: todo
gate: <command>
done when: <one sentence, the whole scope>
needs: <ids, or empty>
blocked:
source: <spec §, issue, review>
files: <paths the work should touch>

<Two or three sentences of context: what this is for, and the trap the last
person hit here. Nothing that repeats the fields above.>
```

## Who wrote it

If an agent drafted the `done when:` clauses, the gates and the `OPERATOR` classifications, say so
at the top of the file with the date. The first run then grades itself against its own standard,
and any completion count should be read with that in mind. `git log` cannot show the difference,
because the commit author is whoever's git config was on the machine.
