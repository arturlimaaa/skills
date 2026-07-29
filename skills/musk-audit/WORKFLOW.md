# Translating the audit into a dynamic workflow

How Claude should structure the orchestration script when this skill is launched as a dynamic workflow. The governing constraint: the script *is* the sequence gate. Phases run in order; phase N's agents receive only phase N−1's surviving set.

## Why a workflow and not plain subagents

A dynamic workflow holds the plan in code, so the loop, the branching, the gate between phases, and every intermediate result live in script variables instead of Claude's context window. That's what lets the run fan out to dozens or hundreds of agents across five phases without the context drowning — and it's what makes the audit **resumable** and **re-runnable as a saved command** on every branch. The native "independent agents adversarially review each other's findings before they're reported" behavior is exactly the Phase 2 defender pass; the workflow gives it for free.

## Inputs

The audit scope arrives as the script global `args` — a path, a service name, a feature, or an object like `{ scope: "src/billing", depth: "service", skipPhases: [] }`. If `args` is omitted, default to the repo root and warn that whole-repo runs are token-heavy; suggest scoping to one directory first to gauge spend.

## Phase structure (the gate is the whole point)

Model the run as five sequential phases. **Do not parallelize across phases** — that would reintroduce the fiberglass-mat mistake the algorithm exists to prevent. Parallelize *within* a phase.

```
Phase 1  Question requirements   ── survivors ──▶  Phase 2  Delete
Phase 2  Delete                  ── survivors ──▶  Phase 3  Simplify
Phase 3  Simplify                ── survivors ──▶  Phase 4  Accelerate
Phase 4  Accelerate              ── survivors ──▶  Phase 5  Automate
```

Each phase writes its surviving set to a script variable; the next phase reads only that. Things that exit the pipeline (load-bearing requirements, proven-real code, already-fast/already-simple surfaces) are recorded for the report but not passed forward.

### Phase 1 — Question requirements

Enumerate the audit surface: requirements, feature flags, config knobs, validation rules, integrations, dependencies, env vars. Fan out one cheap classifier agent per item (route to a smaller model — this is high-volume, low-judgment work). Each returns:

- the **named current owner** who can justify it, or `ORPHANED` with the evidence trail (last commit author, linked ticket, spec location — or the absence of all three);
- a `LOAD_BEARING` flag for anything in a safety-critical / regulated / aerospace-grade path (these require domain-expert sign-off and are **excluded** from Phase 2, not passed to it).

**Survivors → Phase 2:** orphaned and unjustifiable items become deletion candidates.

### Phase 2 — Delete (paired agents, adversarial)

For each candidate, spawn **two independent agents**:

1. **Deletion-test agent** — applies the deletion test ([DELETION-TEST.md](DELETION-TEST.md)): would removing this concentrate complexity (load-bearing) or just move/vanish it (pass-through)? Plus the standard sweep: dead code, deprecated abstractions, unused integrations, unreferenced flags.
2. **Defender agent** — independent, briefed *only* to prove the candidate is real: find the live caller, the firing path, the test that exercises it, the safety reason. This is the fiberglass-mat test — confirm zero measurable difference before cutting. The two must be different agents (the "comradery is dangerous" corollary); never let the producer grade its own finding.

A candidate is reported **deletable** only when the two converge on "nothing real depends on this." Anything the defender saves is an *add-back*.

Compute and report the realized **add-back rate** (`adds_back / candidates`). Interpret it in the report:
- ≈10% → calibrated.
- ~0% → under-deleted; widen the candidate net and re-run Phase 2.
- ≫10% → over-aggressive net; the Phase 1 gate let through too much.

**Survivors → Phase 3:** proven-real and load-bearing code.

### Phase 3 — Simplify (this is the Pocock skill, gated)

Fan out over survivors to find **shallow** modules and propose **deepening** them. Classify each candidate's dependencies (in-process / local-substitutable / ports-&-adapters / mock) per [DELETION-TEST.md](DELETION-TEST.md) so the proposal says how it would be tested across its seam. Do **not** propose simplifying anything Phase 2 marked deletable — by construction it can't reach here, but assert it.

**Survivors → Phase 4:** simplified, validated surfaces.

### Phase 4 — Accelerate

Fan out over the simplified surfaces only. Audit build, test, CI, and feedback loops for cycle time. Never propose accelerating a surface still carrying a deletion flag. Report concrete slow points with before/after cycle estimates.

### Phase 5 — Automate

Identify now-stable processes safe to automate, and — separately — flag every *existing* automation sitting on top of something an earlier phase flagged for deletion. Each of those is a decommissioning project; list them as liabilities, not wins.

## Runtime limits to design within

- **16 concurrent agents** (fewer on limited cores), **1,000 agents total per run.** Batch the Phase 1 / Phase 2 fan-out so a wide surface doesn't blow the cap — chunk files/requirements and process in waves rather than spawning one agent per item all at once.
- **No mid-run user input.** The five phases can't pause for sign-off between them. If the user wants to approve the deletion list before simplification proceeds, split the run: Phases 1–2 as one workflow, Phases 3–5 as a second workflow seeded with the approved survivors.
- **Agents do I/O; the script coordinates.** The orchestration script has no filesystem/shell access itself — all reading, running, and grepping happens inside agents.
- **Model routing.** Phase 1 classification and the Phase 2 dead-code sweep are cheap and high-volume → route to a smaller model. The deletion-test and defender judgments, and all of Phase 3, want the stronger model.

## Launching, watching, saving

- **Launch:** `ultracode: run the musk-audit skill on <scope>` or "run the musk-audit as a dynamic workflow over <scope>." Claude Code shows the planned phases and asks to confirm before the first run.
- **Watch:** `/workflows` → select the run → drill into any phase to see agent counts, tokens, and what each agent found.
- **Cost-check first:** run on one directory before the whole repo; `/workflows` shows per-agent token usage live and you can stop without losing completed work.
- **Save for reuse:** `/workflows` → `s` → save to `.claude/workflows/` (shared) or `~/.claude/workflows/` (personal). It then runs as `/<name>` and accepts a fresh scope via `args` each time — e.g. an audit you run on every branch before a scaling decision.
