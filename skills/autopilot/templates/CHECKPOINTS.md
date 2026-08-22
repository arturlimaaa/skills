# Checkpoints

The ordered backlog. **The loop takes the first checkpoint that qualifies and does exactly one.**
Rules for choosing are in `PROMPT.md` step 2.

**The loop may change only a `status:` line.** Rewording a checkpoint is legitimate and is its own
commit, before the work, never the commit that marks it done. `PROMPT.md` step 6 holds the rule.

**Drafted by <WHO> on <DATE> from <SOURCE>.** If an agent drafted the `done when:` clauses, the gate
commands and the `OPERATOR` classifications, say so here: the first run then grades itself against
its own standard, and any completion count should be read with that in mind.

Field meanings:

| Field | Meaning |
|---|---|
| `status:` | `todo`, `done`. The loop sets `done` only after the gate exits 0 |
| `gate:` | A shell command whose exit code proves the checkpoint. `OPERATOR` means only a person with hardware, a real environment or a quiet room can prove it |
| `done when:` | The completion criterion. This clause, and only this clause, is the iteration's scope |
| `needs:` | Checkpoint ids that must be `done` first. Empty means nothing |
| `blocked:` | Non-empty means the loop walks past this one. Only <PERSON> clears it |
| `source:` | Where the requirement comes from |
| `files:` | The paths the work is expected to touch |

An `OPERATOR` gate is **not a status an agent can set**. It is not a halt either. The loop walks
past it, records what it needs in `NEEDS-OPERATOR.md`, and keeps reading down the file.

**A checkpoint that mixes agent work with operator work is two checkpoints.** The agent half carries
a gate. The operator half carries `OPERATOR` and the original id, so every earlier reference to it
still resolves.

---

## Decisions <PERSON> took on <DATE>

<The decisions the classifications below rest on. A checkpoint that rests on an unrecorded decision
is a checkpoint the loop will settle by itself. Delete this section only if there are none.>

| # | Decision |
|---|---|
| 1 | <decision> |

---

## Phase <A> · <name>

### <A1> · <short name>

status: todo
gate: <command>
done when: <one sentence, the whole scope>
needs:
blocked:
source: <spec §, issue, review>
files: <paths>

<Two or three sentences of context: what this is for, and the trap the last person hit here.>

### <A2> · <short name>

status: todo
gate: OPERATOR
done when: <one sentence>
needs: <A1>
blocked:
source: <spec §>
files:

<Why no command can prove this, and what a person needs in hand to prove it. Copy that into
NEEDS-OPERATOR.md as soon as the loop first walks past it.>
