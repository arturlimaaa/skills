# Checkpoints

The ordered backlog. **The loop takes the first checkpoint that qualifies and does exactly one.**
Rules for choosing are in `PROMPT.md` step 2.

**The loop may change only a `status:` line.** Everything else in this file belongs to the user.

Field meanings:

| Field | Meaning |
|---|---|
| `status:` | `todo` or `done`. The loop sets `done` only after the gate exits 0 |
| `gate:` | ONE shell command whose exit code proves the checkpoint. `OPERATOR` means only a person can prove it |
| `needs:` | Checkpoint ids that must be `done` first. Empty means nothing |
| `blocked:` | Non-empty means the loop walks past it and files it in `NEEDS-HUMAN.md`. Only the user clears it |
| `source:` | Where the requirement comes from |

An `OPERATOR` gate is a **halt**, not a status an agent can set. That rule is the whole reason this
file has a schema.

---

## Where this stands, <date>

Verified by running every gate, not recalled.

```
<gate 1>   ->  0   <N> passed
<gate 2>   ->  0   <N> files
<gate 3>   ->  0   clean
```

**What is built and pinned by tests:** <one or two sentences>

**What is absent:** <one or two sentences>

---

## Phase A · <what this phase closes>

Everything here is proved by an exit code. This is the loop's natural territory.

### A1 · <the checkpoint, as a sentence>

```
id: <kebab-case-id>
status: todo
gate: <one command>
needs:
blocked:
source: <document and section, or the finding that produced it>
```

**done when** <the scope, precisely, and only the scope. If the checkpoint says to remove
something, say what must survive: that omission is how a real property gets deleted in good faith.>

**watch out.** <What a fresh context would get wrong. The trap, the thing that looks right and is
not, the constraint that lives in another file.>

<Any decision already made, so the agent does not re-litigate it. Any fact that saves a search.>

### A2 · <the next one>

```
id: <id>
status: todo
gate: <one command>
needs: <id of A1, if it depends on it>
blocked:
source: <...>
```

**done when** <...>

**watch out.** <...>

---

## Phase B · <a phase that produces something a person looks at>

<Put the first user-visible thing in its own phase. Everything before it is infrastructure, and it
is worth being able to see how much of the backlog is which.>

---

## Phase C · Operator gates

**The loop walks past each of these and files it in `NEEDS-HUMAN.md`.** They need hardware, a real
credential, a physical environment, or a person's judgment.

### C1 · <the checkpoint>

```
id: <id>
status: todo
gate: OPERATOR
needs: <id>
blocked:
source: <...>
```

**done when** <what the person must observe>

**Why no agent may take this.** <The specific reason. "It needs a person" is not enough: name what
no check can distinguish. If half of it is agent-provable, split it into two checkpoints rather
than losing that half.>

---

## Phase D · <work that is off the critical path>

<Listed so it is not rediscovered, not so it is done next. Say that plainly.>

---

## Blocked, waiting on the user

These are not phased. They stop wherever they sit.

### X1 · <the question>

```
id: <id>
status: todo
gate: <command, or OPERATOR>
needs:
blocked: needs-<user>
source: <...>
```

**done when** <...>

**Why it is blocked.** <What the user reserved, and what evidence exists for the change. A
checkpoint that would alter a decision they asked to be consulted on gets `blocked:` however small
the code change is.>
