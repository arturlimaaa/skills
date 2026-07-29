---
name: musk-audit
description: Audit a codebase, project, or feature by running Elon Musk's five-step algorithm — question requirements, delete, simplify, accelerate, automate — in strict sequence, fanned out as a dynamic workflow with adversarial verification on every finding. Use when the user wants a first-principles audit, a deletion pass, a dead-code/unused-dependency sweep with proof, a complexity-reduction review, or wants to know what in a system shouldn't exist before refactoring or scaling it.
---

# Musk Algorithm Audit

Run a codebase, project, or feature through the five-step algorithm Musk documented in Isaacson's biography — **question requirements → delete → simplify → accelerate → automate** — as a **dynamic workflow** that fans the work across parallel subagents and has independent agents try to refute each finding before it reaches the user.

The output is a **report of candidates with verification verdicts**, not a set of applied changes. The workflow does the expensive parallel *analysis and proof*; a human with authority decides what actually gets cut. (See [Guardrails](#guardrails) for why this line is non-negotiable.)

## The one rule that makes this work

**The sequence is the algorithm.** The steps run in exact order, and each step only operates on what survived the step before it. Optimizing a thing that should be deleted, or accelerating a process that should be deleted, is the most expensive mistake in the framework — Musk burned $2M on a robot for fiberglass mats that turned out to do nothing. Running the steps in any other order is running a different process.

This maps perfectly onto a dynamic workflow's **phases**: each phase consumes the *surviving set* from the previous phase. Phase 2 (Delete) only sees requirements that survived Phase 1. Phase 3 (Simplify) only sees code that survived deletion. The gate between phases is what prevents the fiberglass-mat mistake.

Full algorithm — the five steps, the two operational rules, the corollaries, and the documented limits — is in [ALGORITHM.md](ALGORITHM.md). Read it before running; the subagents are briefed from it.

## When to use

- "Audit this service / feature / repo from first principles."
- "What in here shouldn't exist?" / "Find what we can delete." / "Dead-code and unused-dependency sweep, but prove each one."
- "We're about to refactor / add headcount / scale this — what should we cut first?"
- "Stress-test our requirements — which ones still have a real owner?"

Do **not** reach for this for a routine one-file change, a single bug, or a quick question. A dynamic workflow spends meaningfully more tokens than a normal session; it earns that cost on whole-service or whole-feature scope where dozens of candidates need independent verification.

## The five phases

Each phase is one step of the algorithm. The shape of the fan-out, the adversarial pattern, and the gate are detailed in [WORKFLOW.md](WORKFLOW.md). The tests each agent applies — the **deletion test** and the **provenance / named-owner test** — and the architecture vocabulary used in Phases 2–3 are in [DELETION-TEST.md](DELETION-TEST.md).

### Phase 1 — Question requirements (make them less dumb)

Fan out one agent per requirement, feature flag, config knob, validation rule, integration, and dependency. Each agent traces its target to a **specific named person who can currently justify it** — not a team, not "legal," not "safety." A requirement with no current owner is *orphaned*: added by someone who left, for a concern since resolved, or documented in a spec nobody can find.

> "Your requirements are definitely dumb… Requirements from smart people are the most dangerous, because you're less likely to question them. Always question requirements, even if it came from me." — Musk

**Gate:** orphaned and unjustifiable requirements pass to Phase 2 as deletion candidates. Requirements with a live, named justification are marked load-bearing and exit the pipeline.

### Phase 2 — Delete (the deletion rampage)

Operates **only** on Phase 1's survivors + the dead-code/unused-integration sweep. Fan out across modules and files; each candidate gets:

1. A **deletion-test** agent: imagine deleting it. Does complexity vanish (it was a pass-through — delete) or reappear across N callers (it was earning its keep — defend)?
2. An independent **defender** agent that tries to *prove the candidate is real* — find the live caller, the firing code path, the safety reason. This is the fiberglass-mat test in agent form: confirm zero measurable difference before cutting.

Apply the **10% add-back calibration**: the target is to over-delete enough that roughly one in ten items has to be restored. A deletion list where the defenders saved *nothing* didn't cut deep enough; a list where they saved *most things* cut recklessly. The report shows the realized add-back rate as a calibration readout.

> "We are on a deletion rampage!! Nothing is sacred." — Musk (SpaceX standing order)

**Gate:** survivors (things the defender proved are real, or the deletion test showed are load-bearing) pass to Phase 3.

### Phase 3 — Simplify and optimize

Operates **only** on what survived deletion. This is where engineers are most at home and most in danger — *"the most common error of a smart engineer is to optimize a thing that should not exist,"* which the Phase 1→2 gates have now ruled out. Fan out to find **shallow modules** (interface nearly as complex as the implementation) and propose **deepening** them — consolidating tightly-coupled pieces behind one interface so there's one place to test. Vocabulary and the deepening categories are in [DELETION-TEST.md](DELETION-TEST.md).

**Gate:** simplified, validated surfaces pass to Phase 4.

### Phase 4 — Accelerate cycle time

Operates **only** on validated, simplified surfaces. Audit build/test/CI/feedback loops on those surfaces for speed. The constraint: speed amplifies whatever it's applied to, so it is never applied to anything still flagged for deletion. *"If you're digging your grave, don't dig it faster. Stop digging."*

**Gate:** accelerated, stable processes pass to Phase 5.

### Phase 5 — Automate

Last, and only here. Identify the now-stable, validated processes that are safe to automate, and flag every existing automation built on top of something the earlier phases flagged for deletion — each of those is a future decommissioning project. *"Automating a flawed process locks in the flaw at scale."*

## How to launch it

This skill is an orchestrator spec. To run it as a dynamic workflow, point Claude Code at this skill and ask for a workflow — the docs explicitly support "a skill that fans work out → ask for a workflow that does the same thing." Any of these starts it:

```text
ultracode: run the musk-audit skill on src/billing/
```
```text
Run the musk-audit as a dynamic workflow over the payments service
```

The audit scope (path, service, feature) is passed as the workflow's `args`. The workflow writes phases that respect the sequence gate, fans agents out within the concurrency cap (16 concurrent / 1,000 total per run), and routes the cheap classification fan-out to a smaller model where it can. Mechanics in [WORKFLOW.md](WORKFLOW.md).

Watch progress with `/workflows`. When the run lands, the report is a self-contained HTML file written to the OS temp dir (scaffold in [HTML-REPORT.md](HTML-REPORT.md)). Save the run as a reusable command (`/workflows` → `s`) so the audit re-runs on every branch or before every scaling decision.

## Guardrails

These hold regardless of how the request is phrased.

- **Audit, don't amputate.** The workflow produces a ranked report of candidates with provenance and defender verdicts. It does not auto-delete, auto-refactor, or open destructive PRs. The article is honest about why: deleting a workflow in *knowledge work* also removes invisible coordination that surfaces later as confusion, and the algorithm "works when the person running it has cross-domain authority." The human makes the call; the workflow does the proof.
- **Every deletion candidate needs a defender's verdict before it's reported as deletable.** No candidate ships to the report on a single agent's say-so. Convergence between the deletion-test agent and an independent defender is the bar — this is the workflow's native "agents refute each other" behavior, used deliberately.
- **Safety redundancy is a real requirement, not a dumb one.** In regulated, safety-critical, or aerospace-grade paths, redundancy *is* the design. Flag these as load-bearing in Phase 1 and require domain-expert sign-off before they enter Phase 2 at all. The algorithm gives no quantitative guidance here, so the audit defers rather than guesses.
- **Respect existing decisions.** If a candidate contradicts a recorded ADR or design doc, surface it only when the friction is real enough to justify reopening the decision, and mark it clearly. Don't re-litigate settled calls.

## Credit

The deletion test, the module / interface / seam / depth / shallow vocabulary, the deepening categories, and the self-contained Tailwind + Mermaid report scaffold are adapted from Matt Pocock's `improve-codebase-architecture` skill (github.com/mattpocock/skills). Phase 3 is essentially that skill, slotted into the algorithm's sequence after the deletion gate.
